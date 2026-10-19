/**
 * Coordinate-only collision rules for specific village regions.
 *
 * WALK-BEHIND cells: art painted on the obstacle layer that the player should
 * be able to walk *behind*. These cells are made non-solid (the same mechanism
 * used for the existing VILLAGE_PILLAR_OVERHANGS) and duplicated onto the
 * above-player layer so they draw over the player. The bottom row of each
 * object stays solid so the player cannot walk through its base.
 *
 * FENCE cells: solid cells that are additionally copied onto the above-player
 * layer so they draw over the player (collision is unchanged).
 */

/** East rocks: upper rows of multi-row rock formations (bottom rows stay solid). */
export const VILLAGE_WALK_BEHIND_CELLS = new Set([
  // 2x2 rock; bottom row (26,21)/(27,21) stays solid.
  '26,20',
  '27,20',

  // Three-rock pile; bottom row (31-34,20) stays solid.
  '32,18',
  '33,18',
  '34,18',
  '31,19',
  '32,19',
  '33,19',
  '34,19',

  // Extra formations found while scanning columns 26-34, rows 0-23.
  '29,12',
  '30,12',
  '29,13',
  '30,13',
  '32,15',
  '33,15',

  // Path-side pillars below the statue; bases at y14 stay solid.
  '10,13',
  '13,13',

  // Dojo training posts; bottom row of each stays solid.
  '21,19',
  '23,19',
  '24,19',

  // Left big thatched house ROOF (columns 6-9, rows 5-7): the sand road runs
  // underneath, so the sloped thatch rows must be walk-behind. Rows 8-11 of
  // this house (walls, windows, base) stay solid.
  '6,5', '7,5', '8,5', '9,5',
  '6,6', '7,6', '8,6', '9,6',
  '6,7', '7,7', '8,7', '9,7',
])

/**
 * Cells that must be SOLID with no overlay even though their tile IDs or
 * coordinate rules would otherwise make them walk-behind/walkable. Wins over
 * VILLAGE_PILLAR_OVERHANGS, VILLAGE_WALK_BEHIND_CELLS and the tile-ID rules,
 * for the listed cells only.
 */
export const VILLAGE_FORCE_SOLID_CELLS = new Set([
  // Right big thatched house WALLS (columns 14-17, rows 8-10): windows and
  // wall rows were walk-behind, letting the player walk into the house.
  // Rows 5-7 (roof) stay walk-behind; row 11 (base) was already solid.
  '14,8', '15,8', '16,8', '17,8',
  '14,9', '15,9', '16,9', '17,9',
  '14,10', '15,10', '16,10', '17,10',

  // Dojo sign row and wall/door row (columns 0-3, rows 10-11), including the
  // door cells (1,11) and (2,11). Rows 7-9 (roof) stay walk-behind.
  '0,10', '1,10', '2,10', '3,10',
  '0,11', '1,11', '2,11', '3,11',

  // Garden props next to the little shop: pots/plants and their column of
  // art. The shop roof (20-22, rows 9-10) stays walk-behind; base row 11
  // was already solid.
  '19,8', '20,8', '21,8', '22,8',
  '19,9',
  '19,10',
])

// A cell must never be both walk-behind and force-solid: these two rules
// contradict each other and would silently depend on evaluation order.
for (const cell of VILLAGE_FORCE_SOLID_CELLS) {
  if (VILLAGE_WALK_BEHIND_CELLS.has(cell)) {
    throw new Error(
      `villageRegionRules: cell ${cell} is in both VILLAGE_WALK_BEHIND_CELLS and VILLAGE_FORCE_SOLID_CELLS`,
    )
  }
}

/**
 * Identical dojo training posts elsewhere in the village, noted but not
 * changed yet.
 */
export const DOJO_POST_OTHER_LOCATIONS: string[] = []

/** Fence cells: solid + drawn over the player. */
export const VILLAGE_FENCE_OVERLAY_CELLS = new Set(buildCompoundPerimeter())

/**
 * Orange compound perimeter wall: columns 14-23, rows 14-18 (left column,
 * right column, top row, bottom row). The two door cells (16,18) and (21,18)
 * are excluded so they stay exactly as authored.
 */
function buildCompoundPerimeter(): string[] {
  const cells: string[] = []
  for (let x = 14; x <= 23; x += 1) {
    cells.push(`${x},14`)
    cells.push(`${x},18`)
  }
  for (let y = 15; y <= 17; y += 1) {
    cells.push(`14,${y}`)
    cells.push(`23,${y}`)
  }
  return cells.filter((cell) => cell !== '16,18' && cell !== '21,18')
}
