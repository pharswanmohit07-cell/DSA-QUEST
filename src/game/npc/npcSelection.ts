/** The shared interaction radius, in world pixels. */
export const INTERACT_RADIUS = 48

/**
 * The subset of `Npc` the interaction selector needs. Kept as an interface so
 * the selection logic can be unit-tested without instantiating Phaser sprites.
 */
export interface NpcLike {
  readonly id: string
  /** World-space distance (pixels) between this NPC and the given point. */
  distanceTo(x: number, y: number): number
}

/**
 * Picks the NPC the player is talking to when several interaction zones
 * overlap: the nearest in-range NPC, breaking exact ties by NPC id so the
 * result never depends on array order.
 */
export function selectNearestNpc<T extends NpcLike>(
  npcs: readonly T[],
  x: number,
  y: number,
): T | null {
  let nearest: T | null = null
  let nearestDistance = Infinity
  for (const npc of npcs) {
    const distance = npc.distanceTo(x, y)
    if (distance > INTERACT_RADIUS) continue
    if (
      nearest === null ||
      distance < nearestDistance ||
      (distance === nearestDistance && npc.id < nearest.id)
    ) {
      nearest = npc
      nearestDistance = distance
    }
  }
  return nearest
}
