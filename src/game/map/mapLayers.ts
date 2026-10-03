/**
 * The layer contract between the Tiled export in
 * `src/assets/tiles/ninja-village/MAP.json` and the Phaser scene.
 *
 * The map JSON must expose exactly these tile layers, in this stacking order.
 * Keeping the names in one place means the scene and the auto-tester can never
 * drift apart from the map again (a mismatch here previously stopped the map
 * from loading at all).
 */
export const MAP_LAYER_NAMES = {
  /** Full-floor terrain: grass, dirt paths, sand, and water surfaces. */
  ground: '0_Ground',
  /** Everything solid: walls, houses, trees, fences, and the walkable passage surfaces. */
  obstacles: '1_Obstacles',
  /** Visual duplicates of tree canopies and roofs, drawn above the player. */
  abovePlayer: '2_AbovePlayer',
} as const

export const MAP_LAYER_DEPTHS = {
  ground: 0,
  obstacles: 10,
  abovePlayer: 1000,
} as const

export type MapLayerName = (typeof MAP_LAYER_NAMES)[keyof typeof MAP_LAYER_NAMES]
