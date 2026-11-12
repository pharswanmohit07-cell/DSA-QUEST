/**
 * The feet-level collision footprint shared by NPC and player movement.
 * NPCs remain visual-only objects, so movement code uses this small rectangle
 * to stop them crossing one another while preserving a usable interaction gap.
 */
export function footprintsOverlap(
  firstX: number,
  firstFootY: number,
  secondX: number,
  secondFootY: number,
): boolean {
  return Math.abs(firstX - secondX) < 10 && Math.abs(firstFootY - secondFootY) < 8
}
