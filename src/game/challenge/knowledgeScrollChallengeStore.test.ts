import { beforeEach, describe, expect, it } from 'vitest'
import { challengeStore } from './challengeStore'
import type { ChallengeId } from './challengeTypes'
import { QuestManager } from '../quests/QuestManager'
import { clearKnowledgeScrolls, hasKnowledgeScroll } from '../quests/knowledgeScrolls'

function unlockStackTopic() {
  expect(QuestManager.startTopic('arrays')).toBe(true)
  expect(QuestManager.completeTopic('arrays', { passed: true, masteryGrade: 'S', hintsUsed: 0 })).toBe(true)
  expect(QuestManager.startTopic('stack-operations')).toBe(true)
  expect(QuestManager.completeTopic('stack-operations', { passed: true, masteryGrade: 'S', hintsUsed: 0 })).toBe(true)
}

function unlockQueueTopic() {
  unlockStackTopic()
  expect(QuestManager.startTopic('queues')).toBe(true)
  expect(QuestManager.completeTopic('queues', { passed: true, masteryGrade: 'S', hintsUsed: 0 })).toBe(true)
}

beforeEach(() => {
  challengeStore.closeChallenge(false)
  localStorage.clear()
  QuestManager.reset()
  clearKnowledgeScrolls()
})

describe('independent Stack and Queue Knowledge Scroll challenge rewards', () => {
  it('blocks Stack and Queue Scroll challenges until their matching topics are completed', () => {
    challengeStore.openChallenge('stack-knowledge-scroll' as ChallengeId)
    expect(challengeStore.getSnapshot().activeChallenge).toBeNull()

    challengeStore.openChallenge('queue-knowledge-scroll' as ChallengeId)
    expect(challengeStore.getSnapshot().activeChallenge).toBeNull()
  })

  it('claims only the Stack Scroll after a validated Stack rescue and does not award topic XP or relics', () => {
    unlockStackTopic()
    const before = QuestManager.getCampaign()
    challengeStore.openChallenge('stack-knowledge-scroll' as ChallengeId)
    expect(challengeStore.getSnapshot().activeChallenge).toBe('stack-knowledge-scroll')
    challengeStore.markKnowledgeScrollTrialComplete()
    challengeStore.closeChallenge(true)

    expect(hasKnowledgeScroll('stack-operations')).toBe(true)
    expect(hasKnowledgeScroll('queues')).toBe(false)
    expect(QuestManager.getCampaign().xp).toBe(before.xp)
    expect(QuestManager.getCampaign().relicEntitlements).toEqual(before.relicEntitlements)
    expect(QuestManager.getCampaign().topics).toEqual(before.topics)

    challengeStore.openChallenge('stack-knowledge-scroll' as ChallengeId)
    expect(challengeStore.getSnapshot().activeChallenge).toBeNull()
  })

  it('claims only the Queue Scroll after a validated relay and does not award topic XP or relics', () => {
    unlockQueueTopic()
    const before = QuestManager.getCampaign()
    challengeStore.openChallenge('queue-knowledge-scroll' as ChallengeId)
    expect(challengeStore.getSnapshot().activeChallenge).toBe('queue-knowledge-scroll')
    challengeStore.markKnowledgeScrollTrialComplete()
    challengeStore.closeChallenge(true)

    expect(hasKnowledgeScroll('queues')).toBe(true)
    expect(hasKnowledgeScroll('stack-operations')).toBe(false)
    expect(QuestManager.getCampaign().xp).toBe(before.xp)
    expect(QuestManager.getCampaign().relicEntitlements).toEqual(before.relicEntitlements)
    expect(QuestManager.getCampaign().topics).toEqual(before.topics)
  })

  it('does not award either Scroll when a challenge is cancelled or closed as success before validation', () => {
    unlockStackTopic()
    challengeStore.openChallenge('stack-knowledge-scroll' as ChallengeId)
    challengeStore.closeChallenge(true)
    expect(hasKnowledgeScroll('stack-operations')).toBe(false)

    unlockQueueTopic()
    challengeStore.openChallenge('queue-knowledge-scroll' as ChallengeId)
    challengeStore.closeChallenge(false)
    expect(hasKnowledgeScroll('queues')).toBe(false)
  })
})
