import { describe, expect, it } from 'vitest'
import { getGuardianRelicAction, getGuardianRelicDialogueRoute } from './guardianRelicRouting'

const guardians = [
  { npcId: 'village-monk', topicId: 'linked-lists', prefix: 'monk' },
  { npcId: 'plaza-merchant', topicId: 'searching', prefix: 'merchant' },
  { npcId: 'east-field-red-ninja', topicId: 'sorting', prefix: 'red_ninja' },
  { npcId: 'shrine-shaman', topicId: 'trees', prefix: 'shaman' },
] as const

describe('seven-guardian dialogue routing', () => {
  it.each(guardians)('$npcId offers its own mastery experience while available', ({ npcId, topicId, prefix }) => {
    expect(getGuardianRelicDialogueRoute(npcId, 'available')).toEqual({
      topicId,
      nodeId: `${prefix}_campaign_offer`,
    })
  })

  it.each(guardians)('$npcId keeps a locked guardian in campaign order', ({ npcId, topicId, prefix }) => {
    expect(getGuardianRelicDialogueRoute(npcId, 'locked')).toEqual({
      topicId,
      nodeId: `${prefix}_campaign_locked`,
    })
  })

  it.each(guardians)('$npcId asks the player to accept the Old Man quest before a relic trial', ({ npcId, topicId, prefix }) => {
    expect(getGuardianRelicDialogueRoute(npcId, 'completed', 'quest-not-accepted')).toEqual({
      topicId,
      nodeId: `${prefix}_relic_quest_required`,
    })
  })

  it.each(guardians)('$npcId requires an empty scroll before starting its relic trial', ({ npcId, topicId, prefix }) => {
    expect(getGuardianRelicDialogueRoute(npcId, 'completed', 'empty-scroll-required')).toEqual({
      topicId,
      nodeId: `${prefix}_empty_scroll_required`,
    })
  })

  it.each(guardians)('$npcId offers its relic trial only after mastery and empty-scroll handoff', ({ npcId, topicId, prefix }) => {
    expect(getGuardianRelicDialogueRoute(npcId, 'completed', 'ready')).toEqual({
      topicId,
      nodeId: `${prefix}_relic_offer`,
    })
  })

  it.each(guardians)('$npcId does not offer a second relic after the reward is claimed', ({ npcId, topicId, prefix }) => {
    expect(getGuardianRelicDialogueRoute(npcId, 'completed', 'reward-already-claimed')).toEqual({
      topicId,
      nodeId: `${prefix}_relic_claimed`,
    })
  })

  it.each(guardians)('$npcId maps its two dialogue actions to the correct campaign mode', ({ topicId, prefix }) => {
    expect(getGuardianRelicAction(`${prefix}_mastery_accept`)).toEqual({
      topicId,
      mode: 'mastery',
    })
    expect(getGuardianRelicAction(`${prefix}_relic_accept`)).toEqual({
      topicId,
      mode: 'relic',
    })
  })

  it('does not capture unrelated NPCs or unknown dialogue actions', () => {
    expect(getGuardianRelicDialogueRoute('west-gate-guard', 'available')).toBeNull()
    expect(getGuardianRelicDialogueRoute('village-monk', 'completed', 'another-trial-active')).toBeNull()
    expect(getGuardianRelicAction('unrelated_action')).toBeNull()
  })
})
