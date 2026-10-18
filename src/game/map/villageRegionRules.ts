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
])

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
