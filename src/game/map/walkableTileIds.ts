/**
 * Tile IDs that the Tiled map paints on the `1_Obstacles` layer even though the
 * player must be able to walk across them.
 *
 * The obstacle layer is a visual object layer: every non-empty tile on it is
 * treated as solid. That is correct for walls, trees, fences and water, but the
 * map author also painted passage surfaces, desert pebble tracks and snowfield
 * floor decorations there so they render above the ground layer. Those tiles
 * have to be exempted from collision.
 *
 * The exemption is keyed on the tile ID rather than on a coordinate range so it
 * survives the map being repainted or extended: as long as a gate is drawn with
 * the same graphics, it stays walkable no matter where it sits on the map.
 *
 * Each entry records the passage it was taken from in the current map, which is
 * what `GameAutoTester` reports against.
 */

/** Torii gate north of the player spawn: rows 20-24, columns 11-13. */
const GATE_THRESHOLD_TILE_IDS = [1289, 1290, 1291, 1322, 1323, 1324, 1761, 1762, 1763, 1794, 1795, 1796, 1827, 1828, 1829]

/** Small gate on the west edge of the village: rows 9-11, columns 1-2. */
const WEST_GATE_TILE_IDS = [1260, 1261, 1678, 1679, 1745, 1777]

/** Staircase in the south-west: column 6, rows 30-33. */
const SOUTH_STAIRS_TILE_IDS = [2428]

/** Center of the desert/cave archway: column 30, rows 21-23. */
const DESERT_CAVE_ARCHWAY_TILE_IDS = [1814, 1847, 1880]

/** Doorway tile at (13, 32), south of the staircase. */
const SOUTH_DOORWAY_TILE_IDS = [1588]

/** Pebble tracks painted on the desert obstacle layer. */
const DESERT_PEBBLE_TRACK_TILE_IDS = [2330, 2331, 2332, 2333, 2411]

/** Flat transitions, snow, ice marks and decorative snow rings on the snowfield. */
const SNOW_GROUND_TILE_IDS = [510, 541, 948, 971, 973]

export const WALKABLE_TILE_IDS: ReadonlySet<number> = new Set([
  ...GATE_THRESHOLD_TILE_IDS,
  ...WEST_GATE_TILE_IDS,
  ...SOUTH_STAIRS_TILE_IDS,
  ...DESERT_CAVE_ARCHWAY_TILE_IDS,
  ...SOUTH_DOORWAY_TILE_IDS,
  ...DESERT_PEBBLE_TRACK_TILE_IDS,
  ...SNOW_GROUND_TILE_IDS,
])

export const WALKABLE_TILE_ID_GROUPS: ReadonlyArray<{ name: string; tileIds: readonly number[] }> = [
  { name: 'gate threshold', tileIds: GATE_THRESHOLD_TILE_IDS },
  { name: 'west gate', tileIds: WEST_GATE_TILE_IDS },
  { name: 'south stairs', tileIds: SOUTH_STAIRS_TILE_IDS },
  { name: 'desert/cave archway', tileIds: DESERT_CAVE_ARCHWAY_TILE_IDS },
  { name: 'south doorway', tileIds: SOUTH_DOORWAY_TILE_IDS },
  { name: 'desert pebble tracks', tileIds: DESERT_PEBBLE_TRACK_TILE_IDS },
  { name: 'snow ground and ice decorations', tileIds: SNOW_GROUND_TILE_IDS },
]

/**
 * `Phaser.Tilemaps.Tile.index` for an empty tile is -1, and the clearance flag
 * can push it further negative, so the check is guarded by the lookup itself.
 */
export function isWalkableTile(tileIndex: number): boolean {
  return WALKABLE_TILE_IDS.has(tileIndex)
}
