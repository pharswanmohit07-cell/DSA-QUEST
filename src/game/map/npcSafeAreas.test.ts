import { describe, expect, it } from 'vitest'
import {
  NPC_REGIONS,
  npcRegionForTile,
  tileInNpcRegion,
  isNpcTreeExcludedCell,
  isNpcSpawnExcludedCell,
  isNpcSafeCell,
  validateNpcPlacement,
  NPC_TREE_EXCLUDED_CELLS,
  NPC_SPAWN_EXCLUDED_CELLS,
  NPC_RESERVED_DESTINATION_CELLS,
  isNpcFootprintClearOfStaticBlockers,
  type NpcRegionId,
} from './npcSafeAreas'
import { VILLAGE_NPCS } from '../npc/villageNpcs'
import { WORLD_NPCS } from '../npc/worldNpcs'
import { findGridPath } from '../npc/gridPathfinding'
import { npcFootprintCells } from '../npc/gridPathfinding'
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

  it('rejects rock walk-behind cells as NPC ground', () => {
    expect(validateNpcPlacement(26, 20, 35, 35).ok).toBe(false)
    expect(validateNpcPlacement(28, 14, 35, 35).ok).toBe(true)
    expect(isNpcSafeCell(26, 20)).toBe(false)
    expect(isNpcSafeCell(28, 14)).toBe(true)
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

describe('NPC approach access for the Queue Farmer and Dojo Samurai', () => {
  it('keeps both quest NPCs on reachable, standable homes with an adjacent interaction tile', () => {
    const homes = [
      { id: 'south-farmer', x: 16, y: 24, region: 'central-plaza' },
      { id: 'dojo-samurai', x: 30, y: 18, region: 'east-compound' },
    ] as const

    for (const home of homes) {
      expect(validateNpcPlacement(home.x, home.y, map.width, map.height).ok, home.id).toBe(true)
      expect(npcRegionForTile(home.x, home.y), home.id).toBe(home.region)
      expect(NPC_RESERVED_DESTINATION_CELLS.has(`${home.x},${home.y}`), home.id).toBe(true)

      const openNeighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .filter(([dx, dy]) => !isSolid(home.x + dx, home.y + dy))
      expect(openNeighbours.length, `${home.id} approach tiles`).toBeGreaterThan(0)
    }
  })
})

describe('Farmer static gate-blocker placement', () => {
  it('rejects the old tile hidden by the locked-gate rectangle and accepts the spawn-side tile', () => {
    expect(isNpcFootprintClearOfStaticBlockers(11.5 * 16, 23 * 16, true)).toBe(false)
    expect(isNpcFootprintClearOfStaticBlockers(16.5 * 16, 25 * 16, true)).toBe(true)
    expect(isNpcFootprintClearOfStaticBlockers(16.5 * 16, 25 * 16, false)).toBe(true)
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

  it('validates all 12 authored home tiles as safe NPC ground', () => {
    // Population target: 8 main + 4 ambient = 12 active NPCs.
    expect(all.length).toBe(12)
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

  it('keeps every NPC home footprint off solid collision cells', () => {
    for (const npc of all) {
      const worldX = (npc.tileX + 0.5) * 16
      const worldY = (npc.tileY + 1) * 16
      for (const cell of npcFootprintCells(worldX, worldY)) {
        expect(cell.x, `${npc.id} footprint x`).toBeGreaterThanOrEqual(0)
        expect(cell.y, `${npc.id} footprint y`).toBeGreaterThanOrEqual(0)
        expect(cell.x, `${npc.id} footprint x`).toBeLessThan(map.width)
        expect(cell.y, `${npc.id} footprint y`).toBeLessThan(map.height)
        expect(isSolid(cell.x, cell.y), `${npc.id} footprint overlaps ${cell.x},${cell.y}`).toBe(false)
      }
    }
  })
})

describe('movement simulation: roaming NPCs stay on safe ground', () => {
  const all = [...VILLAGE_NPCS, ...WORLD_NPCS]

  /**
   * Simulates the hybrid ambient roamer's BFS journeys: for each world NPC,
   * path from its home tile to every reachable tile at least
   * `minDestinationTiles` away and assert every cardinal step stays on safe
   * ground (the same contract `MapRoamAi` walks at runtime).
   */
  function isAmbientWalkable(point: { x: number; y: number }): boolean {
    return (
      !isSolid(point.x, point.y) &&
      validateNpcPlacement(point.x, point.y, map.width, map.height).ok
    )
  }

  function ambientDestinations(npcId: string): Array<{ x: number; y: number }> {
    const npc = [...VILLAGE_NPCS, ...WORLD_NPCS].find((candidate) => candidate.id === npcId)!
    const minDistance = npc.movement!.kind === 'ambient'
      ? npc.movement!.minDestinationTiles
      : 3
    const home = { x: npc.tileX, y: npc.tileY }
    const seen = new Set([`${home.x},${home.y}`])
    const queue = [home]
    const destinations: Array<{ x: number; y: number }> = []
    while (queue.length) {
      const current = queue.shift()!
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const next = { x: current.x + dx, y: current.y + dy }
        const key = `${next.x},${next.y}`
        if (next.x < 0 || next.y < 0 || next.x >= map.width || next.y >= map.height) continue
        if (seen.has(key) || !isAmbientWalkable(next)) continue
        seen.add(key)
        queue.push(next)
        if (Math.hypot(next.x - home.x, next.y - home.y) >= minDistance) destinations.push(next)
      }
    }
    return destinations
  }

  it('every ambient destination simulated leg-by-leg never stands on a solid or excluded tile', () => {
    for (const npc of [...VILLAGE_NPCS, ...WORLD_NPCS].filter((candidate) => candidate.movement?.kind === 'ambient')) {
      const home = { x: npc.tileX, y: npc.tileY }
      const destination = ambientDestinations(npc.id).at(-1)
      expect(destination, `${npc.id} has at least one reachable ambient destination`).toBeDefined()
      let cursor = home
      let guard = 200
      const path = findGridPath(home, destination!, isAmbientWalkable, map.width, map.height)
      expect(path, `${npc.id} route from home is discoverable`).not.toBeNull()
      for (const node of path ?? []) {
        expect(Math.abs(node.x - cursor.x) + Math.abs(node.y - cursor.y), `${npc.id} cardinal step`).toBe(1)
        expect(validateNpcPlacement(node.x, node.y, 35, 35).ok, `${npc.id} (${node.x},${node.y}) placement`).toBe(true)
        expect(isSolid(node.x, node.y), `${npc.id} solid tile (${node.x},${node.y})`).toBe(false)
        cursor = node
        guard -= 1
        expect(guard).toBeGreaterThan(0)
      }
    }
  })

  it('routes every ambient destination through actual walkable map cells', () => {
    for (const npc of [...VILLAGE_NPCS, ...WORLD_NPCS].filter((candidate) => candidate.movement?.kind === 'ambient')) {
      const home = { x: npc.tileX, y: npc.tileY }
      for (const goal of ambientDestinations(npc.id).slice(0, 8)) {
        const path = findGridPath(home, goal, isAmbientWalkable, map.width, map.height)
        expect(path, `${npc.id} route to (${goal.x},${goal.y})`).not.toBeNull()
        let previous = home
        for (const node of path ?? []) {
          expect(Math.abs(node.x - previous.x) + Math.abs(node.y - previous.y)).toBe(1)
          expect(isAmbientWalkable(node), `${npc.id} blocked path node (${node.x},${node.y})`).toBe(true)
          previous = node
        }
        expect(previous).toEqual(goal)
      }
    }
  })

  it('routes around an obstacle instead of following a blocked direct leg', () => {
    const isWalkable = (point: { x: number; y: number }) =>
      !isSolid(point.x, point.y) && validateNpcPlacement(point.x, point.y, map.width, map.height).ok
    let start: { x: number; y: number } | null = null
    let goal: { x: number; y: number } | null = null
    let path: ReturnType<typeof findGridPath> = null
    for (let y = 0; y < map.height && !path; y += 1) {
      for (let left = 0; left < map.width && !path; left += 1) {
        for (let right = left + 2; right < map.width && !path; right += 1) {
          const candidateStart = { x: left, y }
          const candidateGoal = { x: right, y }
          if (!isWalkable(candidateStart) || !isWalkable(candidateGoal)) continue
          const directBlocked = Array.from({ length: right - left + 1 }, (_, offset) =>
            isWalkable({ x: left + offset, y }),
          ).some((walkable) => !walkable)
          const candidatePath = findGridPath(candidateStart, candidateGoal, isWalkable, map.width, map.height)
          if (directBlocked && candidatePath?.some((node) => node.y !== y)) {
            start = candidateStart
            goal = candidateGoal
            path = candidatePath
          }
        }
      }
    }

    expect(path).not.toBeNull()
    expect(start).not.toBeNull()
    expect(goal).not.toBeNull()
    expect(path!.some((node) => node.y !== start!.y)).toBe(true)
    expect(path!.every(isWalkable)).toBe(true)
    expect(path!.at(-1)).toEqual(goal)
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
