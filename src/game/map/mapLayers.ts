/**
 * The layer contract between the Tiled export in
 * `src/assets/tiles/ninja-village/MAP.json` and the Phaser scene.
 *
 * The map JSON must expose the three required tile layers in this order.
 * The decorative ground-fence layer is optional for backwards compatibility and
 * must be between ground and obstacles when present. It is visual-only and has
 * no collision; the scene and diagnostics resolve every layer by name.
 */
export const MAP_LAYER_NAMES = {
  /** Full-floor terrain: grass, dirt paths, sand, and water surfaces. */
  ground: '0_Ground',
  /** Optional visual fence tiles drawn behind roofs; never used for collision. */
  groundDecor: '0b_GroundDecor',
  /** Everything solid: walls, houses, trees, fences, and the walkable passage surfaces. */
  obstacles: '1_Obstacles',
  /** Visual duplicates of tree canopies and roofs, drawn above the player. */
  abovePlayer: '2_AbovePlayer',
} as const

export const MAP_LAYER_DEPTHS = {
  ground: 0,
  groundDecor: 5,
  obstacles: 10,
  abovePlayer: 1000,
} as const

export type MapLayerName = (typeof MAP_LAYER_NAMES)[keyof typeof MAP_LAYER_NAMES]
