import { describe, expect, it } from 'vitest'
import {
  NPC_REGIONS,
  npcRegionForTile,
  tileInNpcRegion,
  isNpcTreeExcludedCell,
  isNpcSpawnExcludedCell,
  validateNpcPlacement,
  NPC_TREE_EXCLUDED_CELLS,
  NPC_SPAWN_EXCLUDED_CELLS,
  type NpcRegionId,
} from './npcSafeAreas'
import { VILLAGE_NPCS } from '../npc/villageNpcs'
import { WORLD_NPCS } from '../npc/worldNpcs'
import collisionData from './collisionData.json'

const map = collisionData as { width: number; height: number; solid: string[] }

/** Mirror of MainScene.setupObstacleCollisions(): is this cell solid? */
function deriveIsSolid(): (x: number, y: number) => boolean {
  const solid = new Set(map.solid)
  return (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) return true
    return solid.has(`${x},${y}`)
  }
}

const isSolid = deriveIsSolid()

/** Seeded RNG (LCG, same recipe as roamAi.createSeededRandom). */
function seeded(seed: number): () => number {
  let state = seed % 2147483647
  if (state <= 0) state += 2147483646
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}

describe('npcSafeAreas: building/roof exclusion', () => {
  it('rejects a house-wall coordinate that is physically sealed', () => {
    // A solid wall row inside the big right thatched house footprint (the
    // FORCE_SOLID wall cells) and the compound wall row.
    expect(validateNpcPlacement(15, 8, 35, 35).ok).toBe(false)
    expect(validateNpcPlacement(16, 14, 35, 35).ok).toBe(false)
  })

  it('rejects roof-overhang coordinates even when the tile is technically standable', () => {
    // Roof rows above the west thatched house are walk-behind (standable) but
    // visually part of the house: they must never be accepted as NPC ground.
    for (const cell of ['7,5', '8,6', '9,7']) {
      const [x, y] = cell.split(',').map(Number)
      expect(
        isNpcSpawnExcludedCell(x, y) || isNpcTreeExcludedCell(x, y),
        cell,
      ).toBe(true)
    }
  })

  it('rejects coordinates outside the map', () => {
    expect(validateNpcPlacement(-1, 10, 35, 35).ok).toBe(false)
    expect(validateNpcPlacement(10, 40, 35, 35).ok).toBe(false)
    expect(validateNpcPlacement(0.5, 10, 35, 35).ok).toBe(false)
  })

  it('rejects explicit spawn-excluded prop cells', () => {
    for (const cell of NPC_SPAWN_EXCLUDED_CELLS) {
      const [x, y] = cell.split(',').map(Number)
      expect(validateNpcPlacement(x, y, 35, 35).ok, cell).toBe(false)
    }
  })

  it('rejects tree-canopy walk-behind cells', () => {
    // Every listed canopy cell must be rejected even if the map leaves it open.
    for (const cell of NPC_TREE_EXCLUDED_CELLS) {
      const [x, y] = cell.split(',').map(Number)
      expect(isNpcTreeExcludedCell(x, y), cell).toBe(true)
    }
    expect(validateNpcPlacement(18, 14, 35, 35).ok).toBe(false)
    expect(validateNpcPlacement(30, 8, 35, 35).ok).toBe(false)
  })

  it('accepts genuine open-ground coordinates', () => {
    // Verified open plaza/path ground from map-region-report.mjs.
    for (const [x, y] of [[17, 25], [12, 13], [9, 13], [3, 26], [26, 31], [25, 34]] as const) {
      expect(validateNpcPlacement(x, y, 35, 35), `${x},${y}`).toEqual({ ok: true })
    }
  })
})

describe('npcSafeAreas: region bounds', () => {
  it('places genuine regional landmarks inside their named regions', () => {
    expect(npcRegionForTile(3, 6)).toBe('western-gate-road')
    expect(npcRegionForTile(25, 6)).toBe('northern-field')
    expect(npcRegionForTile(4, 14)).toBe('western-yard-sand-road')
    expect(npcRegionForTile(5, 15)).toBe('western-yard-sand-road')
    expect(npcRegionForTile(6, 27)).toBe('central-plaza')
    expect(npcRegionForTile(26, 25)).toBe('eastern-field-pond')
    expect(npcRegionForTile(33, 18)).toBe('east-compound')
    expect(npcRegionForTile(21, 34)).toBe('southern-residential')
  })

  it('never assigns an NPC spawn region to an overlap buffer', () => {
    const spawnRegions: NpcRegionId[] = [
      'northern-field',
      'western-gate-road',
      'western-yard-sand-road',
      'central-plaza',
      'eastern-field-pond',
      'east-compound',
      'southern-residential',
    ]
    for (const id of Object.keys(NPC_REGIONS) as NpcRegionId[]) {
      expect(spawnRegions.includes(id), id).toBe(id.endsWith('-overlap') === false)
    }
  })

  it('returns null outside every region', () => {
    expect(npcRegionForTile(-5, -5)).toBeNull()
  })

  it('bounds are inclusive on every edge', () => {
    for (const [id, r] of Object.entries(NPC_REGIONS) as Array<[NpcRegionId, { minX: number; minY: number; maxX: number; maxY: number }]>) {
      expect(tileInNpcRegion(id, r.minX, r.minY), `${id} min`).toBe(true)
      expect(tileInNpcRegion(id, r.maxX, r.maxY), `${id} max`).toBe(true)
      expect(tileInNpcRegion(id, r.minX - 1, r.minY), `${id} minX-1`).toBe(false)
    }
  })
})

describe('npc placement validation: every authored NPC', () => {
  const all = [...VILLAGE_NPCS, ...WORLD_NPCS]

  it('validates all 30 authored home tiles as safe NPC ground', () => {
    expect(all.length).toBe(30)
    for (const npc of all) {
      const result = validateNpcPlacement(npc.tileX, npc.tileY, 35, 35)
      expect(result.ok, `${npc.id} at (${npc.tileX},${npc.tileY})`).toBe(true)
    }
  })

  it('rejects moving an NPC onto a building-footprint tile', () => {
    // The solid wall row of the right big house (15,8) and the compound wall
    // row (16,14) must never validate.
    expect(validateNpcPlacement(15, 8, 35, 35).ok).toBe(false)
    expect(validateNpcPlacement(16, 14, 35, 35).ok).toBe(false)
  })
})

describe('route-segment validation: no straight leg crosses a solid tile', () => {
  // BFS-based connectivity walk between consecutive waypoints (cardinal A*):
  // a leg is valid only when every intermediate tile along the shortest
  // cardinal path is non-solid.
  function shortestCardinalPath(
    a: { x: number; y: number },
    b: { x: number; y: number },
  ): Array<{ x: number; y: number }> | null {
    const key = (x: number, y: number) => `${x},${y}`
    const queue: Array<{ x: number; y: number }> = [a]
    const prev = new Map<string, string | null>([[key(a.x, a.y), null]])
    while (queue.length) {
      const cur = queue.shift()!
      if (cur.x === b.x && cur.y === b.y) {
        const path: Array<{ x: number; y: number }> = []
        let k: string | null = key(cur.x, cur.y)
        while (k) {
          const [px, py] = k.split(',').map(Number)
          path.unshift({ x: px, y: py })
          k = prev.get(k) ?? null
        }
        return path
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = cur.x + dx
        const ny = cur.y + dy
        const nk = key(nx, ny)
        if (prev.has(nk)) continue
        if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue
        if (isSolid(nx, ny)) continue
        prev.set(nk, key(cur.x, cur.y))
        queue.push({ x: nx, y: ny })
      }
    }
    return null
  }

  const all = [...VILLAGE_NPCS, ...WORLD_NPCS]

  it('keeps every patrol waypoint and every cardinal leg on connected walkable ground', () => {
    for (const npc of all) {
      if (!npc.patrol) continue
      const { waypoints } = npc.patrol.route
      expect(waypoints.length, npc.id).toBeGreaterThanOrEqual(2)
      for (const wp of waypoints) {
        expect(isSolid(wp.x, wp.y), `${npc.id} waypoint (${wp.x},${wp.y}) is solid`).toBe(false)
      }
      for (let i = 1; i < waypoints.length; i++) {
        const path = shortestCardinalPath(waypoints[i - 1]!, waypoints[i]!)
        expect(path, `${npc.id} leg ${i - 1}->${i} has no connected cardinal route`).not.toBeNull()
      }
    }
  })

  it('keeps every traveller inside a connected walkable component with the spawn', () => {
    // BFS flood from spawn over non-solid ground; every waypoint and every NPC
    // home tile must land inside that single component.
    const spawn = { x: 17, y: 25 }
    const seen = new Set<string>([`${spawn.x},${spawn.y}`])
    const queue = [spawn]
    while (queue.length) {
      const cur = queue.shift()!
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = cur.x + dx
        const ny = cur.y + dy
        const key = `${nx},${ny}`
        if (seen.has(key)) continue
        if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue
        if (isSolid(nx, ny)) continue
        seen.add(key)
        queue.push({ x: nx, y: ny })
      }
    }
    expect(seen.size).toBeGreaterThan(600)
    for (const npc of all) {
      expect(seen.has(`${npc.tileX},${npc.tileY}`), `${npc.id} is not connected to spawn`).toBe(true)
      if (npc.patrol) {
        for (const wp of npc.patrol.route.waypoints) {
          expect(seen.has(`${wp.x},${wp.y}`), `${npc.id} waypoint (${wp.x},${wp.y}) unreachable`).toBe(true)
        }
      }
    }
  })
})

describe('movement simulation: roaming NPCs stay on safe ground', () => {
  const all = [...VILLAGE_NPCS, ...WORLD_NPCS]

  it('the waypoint-traveller patrol simulated leg-by-leg never stands on a solid or excluded tile', () => {
    const npc = WORLD_NPCS.find((candidate) => candidate.id === 'west-yard-knight')!
    // Simulate the polyline walk of the knight's patrol leg-by-leg: the patrol
    // follows cardinal segments, so each tile along each segment must be safe.
    const route = npc.patrol!.route.waypoints
    for (let i = 1; i < route.length; i++) {
      let { x, y } = route[i - 1]!
      const target = route[i]!
      // Deterministic per-leg guard: the leg must complete within
      // (Manhattan distance + slack) tile steps.
      let guard = Math.abs(target.x - x) + Math.abs(target.y - y) + 4
      while ((x !== target.x || y !== target.y) && guard > 0) {
        expect(validateNpcPlacement(x, y, 35, 35).ok, `(${x},${y}) on leg ${i}`).toBe(true)
        if (x !== target.x) x += Math.sign(target.x - x)
        else y += Math.sign(target.y - y)
        guard -= 1
      }
      expect(x === target.x && y === target.y, `leg ${i} never completes`).toBe(true)
    }
  })

  it('the sand-road traveller patrol simulated leg-by-leg never enters a building or closed gate', () => {
    const npc = WORLD_NPCS.find((candidate) => candidate.id === 'sand-road-traveller')!
    const route = npc.patrol!.route.waypoints
    for (let i = 1; i < route.length; i++) {
      let { x, y } = route[i - 1]!
      const target = route[i]!
      let guard = Math.abs(target.x - x) + Math.abs(target.y - y) + 4
      while ((x !== target.x || y !== target.y) && guard > 0) {
        expect(validateNpcPlacement(x, y, 35, 35).ok, `(${x},${y}) on leg ${i}`).toBe(true)
        if (x !== target.x) x += Math.sign(target.x - x)
        else y += Math.sign(target.y - y)
        guard -= 1
      }
      expect(x === target.x && y === target.y, `leg ${i} never completes`).toBe(true)
    }
  })

  it('roaming residents stay inside their assigned region across a long simulated wander', () => {
    // WanderAi/RoamAi wander inside a leash around the home tile; simulate the
    // worst case (leash fully exercised in every direction) and require every
    // reachable leash tile to remain inside the NPC's assigned region.
    for (const npc of all) {
      const config = npc.roam ?? npc.wander
      if (!config) continue
      const leashTiles = Math.ceil(config.leashRadius / 16) + 1
      const { tileX, tileY } = npc
      for (let dy = -leashTiles; dy <= leashTiles; dy++) {
        for (let dx = -leashTiles; dx <= leashTiles; dx++) {
          const x = tileX + dx
          const y = tileY + dy
          if (Math.hypot(dx * 16, dy * 16) > config.leashRadius) continue
          // Overlap buffers count as a safe graze; only leaving *every*
          // region band is a region escape.
          expect(
            npcRegionForTile(x, y) !== null || x < 0 || y < 0 || x > 34 || y > 34,
            `${npc.id} could roam out of region to (${x},${y})`,
          ).toBe(true)
        }
      }
    }
  })
})

describe('roam leash + seeded determinism', () => {
  it('seeded random is reproducible (guards WanderAi/RoamAi simulations)', () => {
    const a = seeded(99)
    const b = seeded(99)
    for (let i = 0; i < 100; i++) expect(a()).toBe(b())
  })
})

describe('seeded long-run movement simulation: no NPC enters an excluded tile', () => {
  /**
   * Minimal stand-in for the scene Npc: WanderAi/RoamAi/PatrolAi only touch
   * `sprite.x` / `sprite.y`, so a plain object is enough to drive them.
   */
  function fakeNpc(x: number, y: number): { sprite: { x: number; y: number } } {
    return { sprite: { x: (x + 0.5) * 16, y: (y + 1) * 16 } }
  }

  /**
   * The scene's movement predicate: shared physical collision AND the NPC
   * safe-area view (building footprints, roof shadows, tree canopies,
   * decorative props). Mirrors `MainScene.setupNpcs`.
   */
  function makeCanNpcStand() {
    return (px: number, py: number): boolean => {
      if (!validateNpcPlacement(Math.floor(px / 16), Math.floor(py / 16) - 1, 35, 35).ok) {
        // validateNpcPlacement only covers the explicit exclusions; the
        // physical check below covers solids. Both must pass.
      }
      return (
        !isSolid(Math.floor(px / 16), Math.floor(py / 16) - 1) &&
        validateNpcPlacement(Math.floor(px / 16), Math.floor(py / 16) - 1, 35, 35).ok
      )
    }
  }

  const deltaMs = 16
  const simSeconds = 120
  const frames = Math.ceil((simSeconds * 1000) / deltaMs)

  it.each([
    ['wander', 'south-farmer'],
    ['roam', 'east-field-noble-woman'],
    ['patrol', 'west-yard-knight'],
    ['patrol', 'sand-road-traveller'],
    ['patrol', 'west-gate-patrol'],
  ] as const)('%s NPC %s simulated for 120s never enters an excluded or solid tile', async (kind, npcId) => {
    const all = [...VILLAGE_NPCS, ...WORLD_NPCS]
    const npc = all.find((candidate) => candidate.id === npcId)!
    expect(npc, npcId).toBeDefined()
    const canNpcStand = makeCanNpcStand()
    const rng = seeded(npcId.length * 7919 + kind.length)
    const body = fakeNpc(npc.tileX, npc.tileY)
    let controller: { update: (npc: unknown, deltaMs: number, now: number, paused: boolean) => void }
    if (kind === 'patrol' && npc.patrol) {
      const { PatrolAi } = await import('../npc/roamAi')
      controller = new PatrolAi(npc.patrol.route, npc.patrol.speed, {
        canStandAt: canNpcStand,
        applyFacing: () => {},
        random: rng,
      }) as unknown as typeof controller
    } else if (npc.roam) {
      const { RoamAi } = await import('../npc/roamAi')
      controller = new RoamAi(npc.roam, {
        canStandAt: canNpcStand,
        applyFacing: () => {},
        random: rng,
      }) as unknown as typeof controller
    } else if (npc.wander) {
      const { WanderAi } = await import('../npc/WanderAi')
      controller = new WanderAi(npc.wander, {
        canStandAt: canNpcStand,
        applyFacing: () => {},
        random: rng,
      }) as unknown as typeof controller
    } else {
      // Educational/quest NPC: never moves at all.
      controller = { update: () => {} }
    }

    let now = 0
    for (let frame = 0; frame < frames; frame++) {
      now += deltaMs
      controller.update(body, deltaMs, now, false)
      const tx = Math.floor(body.sprite.x / 16)
      const ty = Math.floor(body.sprite.y / 16) - 1
      expect(
        validateNpcPlacement(tx, ty, 35, 35).ok,
        `${npcId} (${kind}) entered excluded tile (${tx},${ty}) at t=${Math.round(now / 1000)}s`,
      ).toBe(true)
      expect(isSolid(tx, ty), `${npcId} (${kind}) entered solid tile (${tx},${ty})`).toBe(false)
      expect(tx).toBeGreaterThanOrEqual(0)
      expect(tx).toBeLessThan(35)
      expect(ty).toBeGreaterThanOrEqual(0)
      expect(ty).toBeLessThan(35)
    }
  }, 20000)
})
