import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { challengeStore } from './challengeStore'
import { QuestManager } from '../quests/QuestManager'
import {
  acceptRelicCollectionQuest,
  claimEmptyScrolls,
  clearRelicCollection,
  getRelicCollectionSnapshot,
} from '../quests/relicInventory'
import { RELIC_REWARD_CLAIMED_EVENT } from '../quests/relicRewardEvents'

vi.mock('../../audio/music', () => ({
  startAdventureMusic: vi.fn(),
  startKnowledgeTrialMusic: vi.fn(),
}))
vi.mock('../../audio/soundEffects', () => ({
  playAchievementJingle: vi.fn(),
  playGameOverJingle: vi.fn(),
}))

function completeTopic(topic: 'arrays' | 'stack-operations' | 'queues' | 'linked-lists') {
  expect(QuestManager.startTopic(topic)).toBe(true)
  expect(QuestManager.completeTopic(topic, { passed: true, masteryGrade: 'S', hintsUsed: 0 })).toBe(true)
}

beforeEach(() => {
  challengeStore.closeChallenge(false)
  localStorage.clear()
  QuestManager.reset()
  clearRelicCollection()
  expect(acceptRelicCollectionQuest()).toBe(true)
  expect(claimEmptyScrolls()).toBe('claimed')
})

afterEach(() => {
  challengeStore.closeChallenge(false)
  clearRelicCollection()
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('later guardian relic challenge', () => {
  it('consumes one empty scroll and reveals the guardian-assigned relic after a pass', () => {
    completeTopic('arrays')
    completeTopic('stack-operations')
    completeTopic('queues')
    completeTopic('linked-lists')
    const assigned = getRelicCollectionSnapshot().assignments['linked-lists']
    const listener = vi.fn()
    window.addEventListener(RELIC_REWARD_CLAIMED_EVENT, listener)

    expect(challengeStore.openGuardianRelicTrialExperience('linked-lists')).toBe(true)
    expect(challengeStore.finishGuardianCampaignExperience('linked-lists', true, 0, 0)).toBe(true)

    window.removeEventListener(RELIC_REWARD_CLAIMED_EVENT, listener)
    expect(getRelicCollectionSnapshot().emptyScrollsRemaining).toBe(6)
    expect(getRelicCollectionSnapshot().claimedGuardians).toContain('linked-lists')
    expect(listener).toHaveBeenCalledOnce()
    expect((listener.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({ guardian: 'linked-lists', reward: assigned })
  })

  it('releases the reserved empty scroll when the player leaves without passing', () => {
    completeTopic('arrays')
    completeTopic('stack-operations')
    completeTopic('queues')
    completeTopic('linked-lists')
    expect(challengeStore.openGuardianRelicTrialExperience('linked-lists')).toBe(true)
    expect(challengeStore.finishGuardianCampaignExperience('linked-lists', false, 0, 0)).toBe(false)
    expect(getRelicCollectionSnapshot().emptyScrollsRemaining).toBe(7)
    expect(getRelicCollectionSnapshot().claimedGuardians).not.toContain('linked-lists')
  })
})
