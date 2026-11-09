/**
 * Region-aware roaming tests.
 *
 * Prove that the ambient BFS respects each NPC's assigned macro region, that
 * destination picks stay spread out, that quest-NPC leash and regions are
 * honoured, and that no gate unlock can drag an NPC into the snowfield.
 *
 * Deterministic: the roamer is driven with a seeded random source.
 */
import { describe, expect, it } from 'vitest'
import { MapRoamAi, tileCenterX, tileFootY, tileInMacroRegion } from './mapRoamAi'
import {
  LOCAL_ROAMING_NPC_IDS,
  AMBIENT_ROAMING_NPC_IDS,
  NPC_MOVEMENT_PROFILES,
  NPC_MACRO_REGION_BANDS,
} from './movementProfiles'
import { VILLAGE_NPCS } from './villageNpcs'
import { WORLD_NPCS } from './worldNpcs'
import {
  NPC_POPULATION_WEIGHTS,
  isSnowfieldTile,
  npcRegionForTile,
} from '../map/npcSafeAreas'
import { createSeededRandom } from './roamAi'
import type { Npc } from './Npc'

const GRID_W = 35
const GRID_H = 35

type NpcDefLike = { id: string; region?: string; tileX: number; tileY: number }

const ALL_DEFS: NpcDefLike[] = [...VILLAGE_NPCS, ...WORLD_NPCS] as NpcDefLike[]

const MOVEMENT_IDS: readonly string[] = [...LOCAL_ROAMING_NPC_IDS, ...AMBIENT_ROAMING_NPC_IDS]

/** The profile for an id regardless of local/ambient. */
function profileFor(id: string): { kind: string; region: string } {
  const local = (NPC_MOVEMENT_PROFILES.local as Record<string, unknown>)[id]
  const ambient = (NPC_MOVEMENT_PROFILES.ambient as Record<string, unknown>)[id]
  const profile = (local ?? ambient) as { kind: string; region: string }
  return profile
}

/** The map band recorded on the NPC definition. */
function bandFor(id: string): string | undefined {
  return ALL_DEFS.find((def) => def.id === id)?.region
}

/** The authored home tile of a moving NPC. */
function homeFor(id: string): { x: number; y: number } {
  const def = ALL_DEFS.find((d) => d.id === id)
  if (!def) throw new Error(`missing definition for ${id}`)
  return { x: def.tileX, y: def.tileY }
}

/** Count movement-enabled NPCs per macro region. */
function populationByRegion(): Record<string, number> {
  const counts: Record<string, number> = { village: 0, dungeon: 0, snow: 0 }
  for (const id of MOVEMENT_IDS) counts[profileFor(id).region] += 1
  return counts
}

describe('regional NPC population distribution', () => {
  it('exactly 7 village / 3 dungeon / 2 snow movement NPCs', () => {
    expect(MOVEMENT_IDS).toHaveLength(12)
    expect(populationByRegion()).toEqual({
      village: 7,
      dungeon: 3,
      snow: 2,
    })
  })

  it('the planned ambient population weights match the requested ratio', () => {
    expect(NPC_POPULATION_WEIGHTS['central-plaza']).toBe(7)
    expect(NPC_POPULATION_WEIGHTS['east-compound']).toBe(3)
    expect(NPC_POPULATION_WEIGHTS['northern-field']).toBe(2)
    // Ordering invariant: village > dungeon > snow.
    expect(NPC_POPULATION_WEIGHTS['central-plaza']).toBeGreaterThan(
      NPC_POPULATION_WEIGHTS['east-compound'],
    )
    expect(NPC_POPULATION_WEIGHTS['east-compound']).toBeGreaterThan(
      NPC_POPULATION_WEIGHTS['northern-field'],
    )
  })

  it('every movement NPC has exactly one valid region assignment', () => {
    for (const id of MOVEMENT_IDS) {
      const profile = profileFor(id)
      expect(['village', 'dungeon', 'snow'], `${id} region`).toContain(profile.region)
      // Definition band must resolve into the profile's macro region.
      const band = bandFor(id)
      expect(band, `${id} definition band`).toBeDefined()
      const bands = NPC_MACRO_REGION_BANDS[profile.region as 'village']
      expect(bands, `${id} band ${band} must belong to macro region ${profile.region}`)
        .toContain(band)
    }
  })

  it('quest NPCs keep their authored home position and band', () => {
    // The four local quest NPCs are pinned to their authored homes.
    const expectedHomes: Record<string, { x: number; y: number }> = {
      'elder-masanori': { x: 6, y: 27 },
      'village-guide': { x: 13, y: 25 },
      'village-monk': { x: 9, y: 26 },
      'dojo-samurai': { x: 22, y: 21 },
    }
    for (const [id, home] of Object.entries(expectedHomes)) {
      expect(homeFor(id)).toEqual(home)
      expect(profileFor(id).kind).toBe('local')
    }
  })

  it('no village or dungeon NPC home stands on snowfield ground', () => {
    for (const id of MOVEMENT_IDS) {
      const home = homeFor(id)
      if (profileFor(id).region === 'snow') continue
      expect(isSnowfieldTile(home.x, home.y), `${id} home (${home.x},${home.y})`).toBe(false)
    }
  })

  it('snow NPCs do have their home on snowfield ground', () => {
    for (const id of ['shrine-shaman', 'north-field-scout', 'west-gate-patrol'] as Array<
      'shrine-shaman' | 'north-field-scout' | 'west-gate-patrol'
    >) {
      if (!MOVEMENT_IDS.includes(id)) continue
      const home = homeFor(id)
      expect(isSnowfieldTile(home.x, home.y), `${id} home (${home.x},${home.y})`).toBe(true)
    }
  })
})

describe('region-aware BFS routing', () => {
  it('mask keeps village NPCs out of snowfield tiles', () => {
    for (let y = 0; y < GRID_H; y += 1) {
      for (let x = 0; x < GRID_W; x += 1) {
        if (!isSnowfieldTile(x, y)) continue
        expect(tileInMacroRegion('village', x, y), `village tile (${x},${y})`).toBe(false)
        expect(tileInMacroRegion('dungeon', x, y), `dungeon tile (${x},${y})`).toBe(false)
      }
    }
  })

  it('mask keeps snow NPCs in the north', () => {
    for (let y = 20; y < GRID_H; y += 1) {
      for (let x = 0; x < GRID_W; x += 1) {
        expect(tileInMacroRegion('snow', x, y), `snow tile (${x},${y})`).toBe(false)
      }
    }
    // The snow region covers the northern-field band (rows 0-13) except the
    // western-gate-road strip, which is a village band that merely overlaps
    // the same bounding rectangle. Rows 0-5 and columns 11+ on rows 6-13 are
    // snow; the gate road columns 0-10 on rows 6-13 stay village.
    for (let y = 0; y <= 5; y += 1) {
      for (let x = 0; x < GRID_W; x += 1) {
        expect(tileInMacroRegion('snow', x, y), `snow tile (${x},${y})`).toBe(true)
      }
    }
    for (let y = 6; y <= 13; y += 1) {
      for (let x = 11; x < GRID_W; x += 1) {
        expect(tileInMacroRegion('snow', x, y), `snow tile (${x},${y})`).toBe(true)
        expect(isSnowfieldTile(x, y), `snow-only tile (${x},${y})`).toBe(true)
      }
    }
    for (let y = 6; y <= 13; y += 1) {
      for (let x = 0; x <= 10; x += 1) {
        expect(tileInMacroRegion('snow', x, y), `gate-road tile (${x},${y})`).toBe(false)
        expect(isSnowfieldTile(x, y), `gate-road tile (${x},${y})`).toBe(false)
      }
    }
  })

  it('mask keeps dungeon NPCs inside the compound district', () => {
    for (let y = 0; y < GRID_H; y += 1) {
      for (let x = 0; x < GRID_W; x += 1) {
        const inside = ['east-compound', 'eastern-field-pond'].includes(npcRegionForTile(x, y) ?? '')
        expect(tileInMacroRegion('dungeon', x, y), `dungeon tile (${x},${y})`).toBe(inside)
      }
    }
  })

  function makeGrid(region: 'village' | 'dungeon' | 'snow', lockedGate = false) {
    const isTileWalkable = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return false
      if (lockedGate && x >= 11 && x <= 13 && y >= 20 && y <= 24) return false
      return tileInMacroRegion(region, x, y)
    }
    return { width: GRID_W, height: GRID_H, isTileWalkable }
  }

  function makeNpc(tileX: number, tileY: number): { npc: Npc; sprite: { x: number; y: number; anims: { currentAnim: unknown } } } {
    const sprite = { x: tileCenterX(tileX), y: tileFootY(tileY), anims: { currentAnim: null } }
    return { npc: { id: 'test', sprite } as unknown as Npc, sprite }
  }

  function runRoamer(
    region: 'village' | 'dungeon' | 'snow',
    startTile: { x: number; y: number },
    frames: number,
    lockedGate = false,
  ): { sprite: { x: number; y: number }; destinations: Array<{ x: number; y: number }> } {
    const profile = {
      kind: 'ambient' as const,
      region,
      speed: 24,
      minPauseDuration: 0,
      maxPauseDuration: 0,
      minDestinationTiles: 3,
    }
    const { npc, sprite } = makeNpc(startTile.x, startTile.y)
    const ai = new MapRoamAi({
      profile,
      grid: makeGrid(region, lockedGate),
      canStandAt: () => true,
      applyFacing: () => undefined,
      regionMask: (x, y) => tileInMacroRegion(region, x, y),
      random: createSeededRandom(7),
    })
    const destinations: Array<{ x: number; y: number }> = []
    ai.update(npc, 16, 0, false)
    for (let frame = 0; frame < frames; frame += 1) {
      ai.update(npc, 16, frame * 16 + 1000, false)
      const dest = ai.currentDestination
      if (dest) destinations.push(dest)
    }
    return { sprite, destinations }
  }

  it('a village roamer started near the gate never plans into snow', () => {
    // Start just south of the torii gate (plaza side), the exact spot from
    // which the old unmasked BFS drifted north into the snowfield.
    const { destinations } = runRoamer('village', { x: 12, y: 26 }, 3000)
    expect(destinations.length).toBeGreaterThan(0)
    for (const dest of destinations) {
      expect(isSnowfieldTile(dest.x, dest.y), `destination (${dest.x},${dest.y})`).toBe(false)
      expect(tileInMacroRegion('village', dest.x, dest.y)).toBe(true)
    }
  })

  it('a village roamer still reaches the snow through an unlocked gate path — but never stands on snow', () => {
    // Prove the region mask, not the gate lock, keeps the NPC out: run with
    // the gate *unlocked* (lockedGate = false) and confirm destinations stay
    // off snowfield tiles anyway.
    const { destinations } = runRoamer('village', { x: 12, y: 26 }, 3000, false)
    for (const dest of destinations) {
      expect(isSnowfieldTile(dest.x, dest.y)).toBe(false)
    }
  })

  it('a snow roamer stays north of rows 20-24', () => {
    const { destinations } = runRoamer('snow', { x: 18, y: 11 }, 3000)
    expect(destinations.length).toBeGreaterThan(0)
    for (const dest of destinations) {
      expect(dest.y, `snow destination (${dest.x},${dest.y})`).toBeLessThanOrEqual(13)
      expect(tileInMacroRegion('snow', dest.x, dest.y)).toBe(true)
    }
  })

  it('a dungeon roamer stays inside the compound district', () => {
    const { destinations } = runRoamer('dungeon', { x: 18, y: 16 }, 3000)
    expect(destinations.length).toBeGreaterThan(0)
    for (const dest of destinations) {
      const band = npcRegionForTile(dest.x, dest.y)
      expect(['east-compound', 'eastern-field-pond']).toContain(band)
    }
  })

  it('destinations are spread out, not all on one tile', () => {
    const { destinations } = runRoamer('village', { x: 12, y: 26 }, 3000)
    const unique = new Set(destinations.map((d) => `${d.x},${d.y}`))
    // The plaza-side mask admits only the gate corridor and the plaza itself
    // (a narrow region, by design). Even so the roamer must not keep picking
    // the same tile: at least two distinct destinations across many plans.
    expect(unique.size, `distinct destinations from ${destinations.length} plans`).toBeGreaterThan(1)
  })

  it('a snow roamer picks spread destinations across the north field', () => {
    const { destinations } = runRoamer('snow', { x: 18, y: 11 }, 3000)
    const unique = new Set(destinations.map((d) => `${d.x},${d.y}`))
    expect(unique.size, `distinct snow destinations from ${destinations.length} plans`).toBeGreaterThan(3)
  })

  it('no village destination collides with a quest NPC interaction tile', () => {
    const reserved = ['6,27', '5,27', '6,28', '13,25', '9,26', '22,21', '17,25']
    const { destinations } = runRoamer('village', { x: 12, y: 26 }, 3000)
    for (const dest of destinations) {
      expect(reserved).not.toContain(`${dest.x},${dest.y}`)
    }
  })

  it('NPC occupancy is still honoured inside the region mask', () => {
    const profile = {
      kind: 'ambient' as const,
      region: 'village' as const,
      speed: 24,
      minPauseDuration: 0,
      maxPauseDuration: 0,
      minDestinationTiles: 3,
    }
    const { npc } = makeNpc(12, 26)
    const occupied = new Set(['12,23', '12,24'])
    const ai = new MapRoamAi({
      profile,
      grid: makeGrid('village'),
      canStandAt: () => true,
      applyFacing: () => undefined,
      regionMask: (x, y) => tileInMacroRegion('village', x, y),
      isOccupied: (x, y) => occupied.has(`${x},${y}`),
      random: createSeededRandom(3),
    })
    ai.update(npc, 16, 0, false)
    for (let frame = 0; frame < 1200; frame += 1) {
      ai.update(npc, 16, frame * 16 + 1000, false)
      const dest = ai.currentDestination
      if (dest) expect(occupied.has(`${dest.x},${dest.y}`)).toBe(false)
    }
  })

  it('a roamer that cannot stand in its region refuses to plan at all', () => {
    // Start on a tile that is NOT in the assigned region: no route may ever be
    // planned (prevents deepening a wrong-region spawn).
    const profile = {
      kind: 'ambient' as const,
      region: 'snow' as const,
      speed: 24,
      minPauseDuration: 0,
      maxPauseDuration: 0,
      minDestinationTiles: 3,
    }
    const { npc } = makeNpc(3, 26) // southern plaza, wrong region for snow
    const ai = new MapRoamAi({
      profile,
      grid: makeGrid('snow'),
      canStandAt: () => true,
      applyFacing: () => undefined,
      regionMask: (x, y) => tileInMacroRegion('snow', x, y),
      random: createSeededRandom(5),
    })
    ai.update(npc, 16, 0, false)
    for (let frame = 0; frame < 200; frame += 1) {
      ai.update(npc, 16, frame * 16 + 1000, false)
      expect(ai.walking).toBe(false)
      expect(ai.currentDestination).toBeNull()
    }
  })
})

describe('local quest-NPC region and leash', () => {
  it('every local NPC has a small leash and a valid region', () => {
    for (const id of LOCAL_ROAMING_NPC_IDS) {
      const profile = (NPC_MOVEMENT_PROFILES.local as Record<string, { leashRadiusTiles: number; region: string }>)[id]
      expect(profile.leashRadiusTiles).toBeGreaterThan(0)
      expect(profile.leashRadiusTiles).toBeLessThanOrEqual(4)
      expect(['village', 'dungeon', 'snow']).toContain(profile.region)
    }
  })

  it('a leash of the given radius cannot reach outside the assigned region', () => {
    for (const id of LOCAL_ROAMING_NPC_IDS) {
      const profile = (NPC_MOVEMENT_PROFILES.local as Record<string, { leashRadiusTiles: number; region: string }>)[id]
      const home = homeFor(id)
      const radius = Math.ceil(profile.leashRadiusTiles) + 1 // a tile of slack
      const region = profile.region as 'village'
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (Math.hypot(dx, dy) > profile.leashRadiusTiles) continue
          const tx = home.x + dx
          const ty = home.y + dy
          if (tx < 0 || ty < 0 || tx >= GRID_W || ty >= GRID_H) continue
          if (!tileInMacroRegion(region, tx, ty)) {
            // The tile is outside the macro region mask entirely; the leash
            // must not reach it. Flag if it does.
            const reachableByLeash = Math.hypot(dx, dy) <= profile.leashRadiusTiles
            expect(reachableByLeash, `${id} leash could reach (${tx},${ty}) outside ${profile.region}`).toBe(false)
          }
        }
      }
    }
  })
})

describe('ambient roaming profile consistency', () => {
  it('every ambient profile names its region and keeps distinct speeds', () => {
    const speeds = new Set<number>()
    for (const id of AMBIENT_ROAMING_NPC_IDS) {
      const profile = (NPC_MOVEMENT_PROFILES.ambient as Record<string, { region: string; speed: number; minDestinationTiles: number }>)[id]
      expect(['village', 'dungeon', 'snow']).toContain(profile.region)
      expect(profile.minDestinationTiles).toBeGreaterThan(0)
      speeds.add(profile.speed)
    }
    // At least three distinct walking paces across the population.
    expect(speeds.size).toBeGreaterThanOrEqual(3)
  })

  it('all macro regions list only valid map bands', () => {
    const validBands = [
      'northern-field', 'western-gate-road', 'western-yard-sand-road',
      'central-plaza', 'eastern-field-pond', 'east-compound',
      'southern-residential',
    ]
    for (const bands of Object.values(NPC_MACRO_REGION_BANDS)) {
      for (const band of bands) expect(validBands).toContain(band)
    }
  })
})
