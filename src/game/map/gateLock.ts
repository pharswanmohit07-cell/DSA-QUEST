/**
 * The quest-locked torii gate.
 *
 * The gate threshold tiles are already in `walkableTileIds.ts` so the player can
 * cross them freely. The quest needs the opposite behaviour: the threshold is
 * sealed until the Array Sorting challenge is solved, and only then does it
 * become passable.
 *
 * The lock is expressed as a rectangle of grid cells rather than a list of GIDs,
 * because the gate is a specific place. Sealing the cells (instead of removing
 * their GIDs from the walkable allowlist) keeps `WALKABLE_TILE_IDS` a pure
 * description of the artwork, and means unlocking is a pure runtime change with
 * no map edits.
 */

export type GateLock = {
  /** Inclusive tile column range. */
  minX: number
  maxX: number
  /** Inclusive tile row range. */
  minY: number
  maxY: number
}

/**
 * The torii gate threshold: rows 20-24, columns 11-13.
 *
 * Measured against the map: this is the only corridor between the southern
 * village and the northern snowfield, so sealing it drops the reachable area
 * from 257 tiles to 219.
 */
export const TORII_GATE_LOCK: GateLock = {
  minX: 11,
  maxX: 13,
  minY: 20,
  maxY: 24,
}

/** True when this cell is part of the locked gate. */
export function isInsideGateLock(gate: GateLock, tileX: number, tileY: number): boolean {
  return tileX >= gate.minX && tileX <= gate.maxX && tileY >= gate.minY && tileY <= gate.maxY
}

/** Every cell of the lock, for diagnostics. */
export function gateLockCells(gate: GateLock): Array<{ x: number; y: number }> {
  const cells: Array<{ x: number; y: number }> = []
  for (let y = gate.minY; y <= gate.maxY; y += 1) {
    for (let x = gate.minX; x <= gate.maxX; x += 1) {
      cells.push({ x, y })
    }
  }
  return cells
}
