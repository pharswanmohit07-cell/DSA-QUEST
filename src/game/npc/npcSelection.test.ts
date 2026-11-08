import { describe, expect, it } from 'vitest'
import { INTERACT_RADIUS, selectNearestNpc, type NpcLike } from './npcSelection'

function makeNpc(id: string, x: number, y: number): NpcLike {
  return {
    id,
    distanceTo(px: number, py: number) {
      return Math.hypot(px - x, py - y)
    },
  }
}

describe('selectNearestNpc', () => {
  it('uses the shared 48px interaction radius', () => {
    expect(INTERACT_RADIUS).toBe(48)
  })

  it('returns null when no NPC is in range', () => {
    const npcs = [makeNpc('a', 100, 100)]
    expect(selectNearestNpc(npcs, 0, 0)).toBeNull()
  })

  it('selects the nearest NPC when interaction zones overlap', () => {
    // Two NPCs 50px apart, so their 48px zones overlap heavily.
    const guide = makeNpc('guide', 100, 100)
    const monk = makeNpc('monk', 150, 100)
    const nearest = selectNearestNpc([guide, monk], 120, 100)
    expect(nearest?.id).toBe('guide')
  })

  it('is independent of the NPC array order', () => {
    const a = makeNpc('a', 100, 100)
    const b = makeNpc('b', 130, 100)
    const player = { x: 110, y: 100 }
    expect(selectNearestNpc([a, b], player.x, player.y)?.id).toBe('a')
    expect(selectNearestNpc([b, a], player.x, player.y)?.id).toBe('a')
  })

  it('breaks exact distance ties deterministically by NPC id', () => {
    const zeta = makeNpc('zeta', 90, 100)
    const alpha = makeNpc('alpha', 110, 100)
    const player = { x: 100, y: 100 }
    expect(selectNearestNpc([zeta, alpha], player.x, player.y)?.id).toBe('alpha')
    expect(selectNearestNpc([alpha, zeta], player.x, player.y)?.id).toBe('alpha')
  })

  it('still selects an NPC standing exactly on the interaction radius', () => {
    const npc = makeNpc('edge', 148, 100)
    expect(selectNearestNpc([npc], 100, 100)?.id).toBe('edge')
  })

  it('rejects NPCs just outside the radius', () => {
    const npc = makeNpc('far', 149, 100)
    expect(selectNearestNpc([npc], 100, 100)).toBeNull()
  })
})
