import { describe, expect, it } from 'vitest'
import { WanderAi } from './WanderAi'
import { profileToWanderConfig, NPC_MOVEMENT_PROFILES } from './movementProfiles'
import { createSeededRandom } from './roamAi'

const TILE = 16

/**
 * Drives a `WanderAi` built from a local profile on a fully open 20×20 grid
 * and asserts the NPC never leaves its home leash.
 */
describe('local roaming (WanderAi via local profiles)', () => {
  it('each local NPC stays inside its leash radius from home', () => {
    for (const [npcId, profile] of Object.entries(NPC_MOVEMENT_PROFILES.local)) {
      const config = profileToWanderConfig(profile)
      const homeX = 10 * TILE
      const homeY = 10 * TILE + TILE // feet anchor
      const sprite = { x: homeX, y: homeY }
      const npc = { id: npcId, sprite } as never
      const ai = new WanderAi(config, {
        canStandAt: () => true,
        applyFacing: () => undefined,
      })
      const random = createSeededRandom(7)
      ai.update(npc, 16, 0, false)
      for (let frame = 0; frame < 4000; frame += 1) {
        // Re-randomise heading choices via phase transitions inside the AI;
        // the AI uses Math.random internally for WanderAi headings, so we only
        // assert the safety invariant here.
        ai.update(npc, 16, frame * 16, false)
        const dist = Math.hypot(sprite.x - homeX, sprite.y - homeY)
        expect(dist, `${npcId} exceeded leash`).toBeLessThanOrEqual(config.leashRadius + 1)
        if (frame % 512 === 0) random()
      }
    }
  })

  it('profileToWanderConfig converts tile leashes to pixels', () => {
    const config = profileToWanderConfig(NPC_MOVEMENT_PROFILES.local['elder-masanori'])
    expect(config.leashRadius).toBe(NPC_MOVEMENT_PROFILES.local['elder-masanori'].leashRadiusTiles * TILE)
    expect(config.speed).toBe(NPC_MOVEMENT_PROFILES.local['elder-masanori'].speed)
  })
})
