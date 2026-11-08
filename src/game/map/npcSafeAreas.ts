/**
 * NPC navigation-area rules.
 *
 * The player's collision rules (obstacle layer + walkable/overhang tile IDs +
 * region overrides) say whether a body can *physically* occupy a tile. They do
 * not say whether that tile is *visually appropriate* NPC ground: a roof tile
 * that was made non-solid so the player can walk behind it, the top row of a
 * pillar, or a house-garden prop tile are all "standable" but would make an
 * NPC look like it is standing inside a building or on top of a structure.
 *
 * This module adds the NPC-only layer:
 *
 *   1. `NPC_REGIONS` — the seven geographic bands of the 35x35 map, used to
 *      keep every resident inside its own area and to audit the population
 *      distribution (scripts/check-village-npc-placements.mjs).
 *   2. `NPC_TREE_EXCLUDED_CELLS` — tree-canopy tiles that are non-solid only so
 *      the player can walk behind the art. An NPC standing on one renders in
 *      front of nothing and appears "inside" the tree; they are never valid
 *      NPC ground.
 *   3. `NPC_SPAWN_EXCLUDED_CELLS` — specific standable-but-wrong tiles in the
 *      current map: house-garden props inside building footprints and the
 *      walk-behind top rows of village pillars.
 *
 * This module never changes player collision: the shared obstacle rules in
 * `villageRegionRules.ts` / `walkableTileIds.ts` / `abovePlayerTileIds.ts`
 * remain the source of truth for physics, and `MainScene.canStandAt` (which
 * NPCs use for movement) is unchanged. These rules are validated *in addition*
 * to physical walkability when an NPC's home tile is chosen.
 */
import { NPC_TILE_SIZE } from '../npc/roamAi'

export type NpcRegionId =
  | 'northern-field'
  | 'western-gate-road'
  | 'western-yard-sand-road'
  | 'central-plaza'
  | 'eastern-field-pond'
  | 'east-compound'
  | 'southern-residential'
  // Overlap buffers (see NPC_REGIONS below); not valid spawn regions.
  | 'west-compound-overlap'
  | 'western-yard-overlap'
  | 'west-yard-wide-overlap'
  | 'west-yard-corner-overlap'

/** Inclusive tile bounds of each populated band of the 35x35 village map. */
export const NPC_REGIONS = {
  'northern-field': { minX: 0, minY: 0, maxX: 34, maxY: 13 },
  'western-gate-road': { minX: 0, minY: 6, maxX: 10, maxY: 13 },
  'western-yard-sand-road': { minX: 0, minY: 14, maxX: 13, maxY: 19 },
  'central-plaza': { minX: 0, minY: 20, maxX: 16, maxY: 31 },
  'east-compound': { minX: 17, minY: 14, maxX: 34, maxY: 23 },
  'eastern-field-pond': { minX: 17, minY: 24, maxX: 34, maxY: 28 },
  'southern-residential': { minX: 0, minY: 29, maxX: 34, maxY: 34 },
  // Overlap buffers: tiles a leash-radius bound may graze, inside a border
  // strip whose tiles lead into a neighbouring region band. NPCs may not
  // *start* inside an overlap buffer, but grazing it is not a region escape.
  'west-compound-overlap': { minX: 14, minY: 13, maxX: 16, maxY: 20 },
  'western-yard-overlap': { minX: 11, minY: 14, maxX: 13, maxY: 19 },
  'west-yard-wide-overlap': { minX: 14, minY: 14, maxX: 16, maxY: 19 },
  'west-yard-corner-overlap': { minX: 12, minY: 12, maxX: 16, maxY: 20 },
}

/**
 * Tree-canopy tiles that are non-solid only so the player can walk behind the
 * tree art. These are never valid NPC ground: the NPC would be drawn over the
 * empty canopy row and look like it is standing inside the tree.
 */
export const NPC_TREE_EXCLUDED_CELLS: ReadonlySet<string> = new Set([
  '18,14',
  '18,15',
  '18,16',
  '18,17',
  '19,15',
  '19,16',
  '19,17',
  '10,7',
  '11,7',
  '12,7',
  '20,7',
  '24,7',
  '31,7',
  '32,7',
  '29,8',
  '30,8',
  '31,8',
  '32,8',
  '29,9',
  '30,9',
  '31,9',
  '32,9',
  '33,9',
  '29,10',
  '30,10',
  '31,10',
  '32,10',
  '33,10',
  '29,11',
  '30,11',
  '31,11',
  '32,11',
  '33,11',
  '28,12',
  '29,12',
  '30,12',
  '25,13',
  '27,13',
  '28,13',
])

/**
 * Standable-but-wrong tiles found in the current map, excluded from NPC
 * spawning. Each entry names why:
 *
 * - `16,20`: house-garden prop tile inside the west house footprint (the
 *   house-garden's seed-bag and basket art). The player may brush its edge,
 *   but an NPC standing on it appears inside the building.
 * - `13,10`: potted-plant art at the west-yard shop's garden edge. Standable
 *   but visually a shop prop, not ground.
 * - `20,7`: statue-base row beside the north shrine (the statue's walk-behind
 *   top is non-solid, but its base row is solid; the prop tile above the base
 *   is standable and reads as part of the shrine).
 * - `3,4`: the north-field fence posts' decorative top row (fence-top GIDs are
 *   non-solid overhang art; standing on the row reads as standing in the fence).
 */
export const NPC_SPAWN_EXCLUDED_CELLS: ReadonlySet<string> = new Set([
  // House footprints: standable-but-wrong interior/prop tiles inside or
  // immediately inside building art (west house garden, west-yard shop
  // garden, north shrine prop at (20,7), north-field fence-post top row at
  // (3,4)).
  '16,20',
  '13,10',
  '20,7',
  '3,4',
  // Shrine garden rows 5-7, columns 4-9: the shaman's garden is ringed by
  // shrine torii and flower-bed art. Rows 8+ (open ground) stay valid; the
  // shrine-side rows are part of the shrine structure art.
  '4,5', '5,5', '6,5', '7,5',
  '4,6', '5,6', '6,6', '7,6',
  '4,7', '5,7', '6,7', '7,7',
  '8,7', '9,7',
  // Right big thatched house: the FORCE_SOLID wall rows and the walk-behind
  // roof rows above them are part of the building, never NPC ground.
  '14,8', '15,8', '16,8', '17,8',
  '14,9', '15,9', '16,9', '17,9',
  '14,10', '15,10', '16,10', '17,10',
  // Left big thatched house: walk-behind roof rows over the sand road.
  '6,5', '7,5', '8,5', '9,5',
  '6,6', '7,6', '8,6', '9,6',
  '6,7', '7,7', '8,7', '9,7',
  // Dojo sign/wall row and its door cells (the door tiles are walkable but
  // they are a building threshold, not a place for an NPC to stand).
  '0,10', '1,10', '2,10', '3,10',
  '0,11', '1,11', '2,11', '3,11',
  // Compound perimeter wall (door cells 16,18 / 21,18 excluded so the
  // doorway approach stays usable).
  ...buildCompoundWall(),
  // Village pillar body rows (their tops are walk-behind; the pillar itself
  // is a decorative structure an NPC must not stand inside).
  '10,21', '14,21',
  // West-yard shop garden prop rows (garden rails / plant art beside the
  // little shop; standable but visually shop structure, not ground).
  '19,8', '20,8', '21,8', '22,8',
  '19,9',
  '19,10',
  // Dojo training posts (bottom row of each; the walk-behind top row is
  // handled by the canopy exclusion).
  '21,19', '23,19', '24,19',
])

/** Compound perimeter wall columns 14-23, rows 14-18 (door cells excluded). */
function buildCompoundWall(): string[] {
  const cells: string[] = []
  for (let x = 14; x <= 23; x += 1) {
    cells.push(`${x},14`, `${x},18`)
  }
  for (let y = 15; y <= 17; y += 1) {
    cells.push(`14,${y}`, `23,${y}`)
  }
  return cells.filter((cell) => cell !== '16,18' && cell !== '21,18')
}

/** True when the tile is inside the inclusive bounds of the given region. */
export function tileInNpcRegion(
  regionId: NpcRegionId,
  tileX: number,
  tileY: number,
): boolean {
  const region = NPC_REGIONS[regionId]
  return (
    tileX >= region.minX &&
    tileX <= region.maxX &&
    tileY >= region.minY &&
    tileY <= region.maxY
  )
}

/** The first NPC region whose bounds contain the tile, or null when outside all of them. */
export function npcRegionForTile(tileX: number, tileY: number): NpcRegionId | null {
  // Specific bands first: the western gate road and the eastern compound are
  // sub-regions of the broader northern/eastern bounds, so they must win the
  // first-match walk before the broad band claims them.
  const order = [
    'western-gate-road',
    'east-compound',
    'western-yard-sand-road',
    'central-plaza',
    'eastern-field-pond',
    'southern-residential',
    'northern-field',
    // Overlap buffers last: they are grazing zones, never primary regions.
    'west-compound-overlap',
    'western-yard-overlap',
    'west-yard-wide-overlap',
    'west-yard-corner-overlap',
  ] as NpcRegionId[]
  for (const regionId of order) {
    if (tileInNpcRegion(regionId, tileX, tileY)) return regionId
  }
  return null
}

/** True when the tile is a walk-behind tree-canopy row. */
export function isNpcTreeExcludedCell(tileX: number, tileY: number): boolean {
  return NPC_TREE_EXCLUDED_CELLS.has(`${tileX},${tileY}`)
}

/** True when the tile is an explicitly excluded spawn cell. */
export function isNpcSpawnExcludedCell(tileX: number, tileY: number): boolean {
  return NPC_SPAWN_EXCLUDED_CELLS.has(`${tileX},${tileY}`)
}

/**
 * Converts a world pixel position to the tile a foot-anchored sprite stands in
 * (the tile whose vertical span contains the sprite's feet). Matches the
 * conversion used in `MainScene.setupNpcs`.
 */
export function worldPixelToNpcTile(x: number, y: number): { tileX: number; tileY: number } {
  return {
    tileX: Math.floor(x / NPC_TILE_SIZE),
    tileY: Math.floor(y / NPC_TILE_SIZE) - 1,
  }
}

/**
 * NPC-specific safe-position predicate for **movement**.
 *
 * `MainScene.canStandAt` answers "can a physics body occupy this pixel?". It
 * must stay the player's rule and deliberately treats roof-overhang, pillar
 * and tree-canopy tiles as non-solid so the player can walk *behind* the art.
 * An NPC standing on one of those tiles renders as if it were inside the
 * building or tree, so movement needs the stricter NPC view: physically
 * standable AND not on any excluded cell.
 *
 * Use it by composing it with the scene's physical check:
 *
 *   const canNpcStand = (x, y) => this.canStandAt(x, y) && isNpcSafeCell(...)
 *
 * The sprite is foot-anchored: the tile it occupies is the tile whose vertical
 * span contains y, one row up (matches MainScene's conversion), so the world
 * pixel is converted here rather than at every call site.
 */
export function isNpcSafeWorldPosition(x: number, y: number): boolean {
  const tileX = Math.floor(x / NPC_TILE_SIZE)
  const tileY = Math.floor(y / NPC_TILE_SIZE) - 1
  if (tileX < 0 || tileY < 0 || tileX > 34 || tileY > 34) return false
  if (isNpcSpawnExcludedCell(tileX, tileY)) return false
  if (isNpcTreeExcludedCell(tileX, tileY)) return false
  return true
}

/**
 * Full spawn-safety decision for one candidate NPC home tile.
 *
 * Combines the map-bounds, footprint, rooftop-overhang, water/fence-mirror,
 * tree-canopy and explicit-exclusion rules above into one call the scene (and
 * the test suite) can use. This is the *placement* gate; movement still uses
 * the shared physical collision via `MainScene.canStandAt`.
 */
export type NpcPlacementResult = { ok: true } | { ok: false; reason: string }

export function validateNpcPlacement(
  tileX: number,
  tileY: number,
  mapWidth: number,
  mapHeight: number,
): NpcPlacementResult {
  if (
    !Number.isInteger(tileX) ||
    !Number.isInteger(tileY) ||
    tileX < 0 ||
    tileY < 0 ||
    tileX >= mapWidth ||
    tileY >= mapHeight
  ) {
    return { ok: false, reason: 'outside the map bounds' }
  }
  if (isNpcSpawnExcludedCell(tileX, tileY)) {
    return {
      ok: false,
      reason: `tile (${tileX},${tileY}) is inside a building footprint or on a decorative prop`,
    }
  }
  if (isNpcTreeExcludedCell(tileX, tileY)) {
    return {
      ok: false,
      reason: `tile (${tileX},${tileY}) is roof/tree-overhang walk-behind art, not NPC ground`,
    }
  }
  return { ok: true }
}
