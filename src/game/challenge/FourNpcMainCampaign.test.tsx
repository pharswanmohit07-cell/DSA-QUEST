import { beforeEach, describe, expect, it } from 'vitest'
import { challengeStore } from './challengeStore'
import type { ChallengeId } from './challengeTypes'
import { QuestManager } from '../quests/QuestManager'
import { getMainCampaignBlocker } from '../quests/mainCampaignRouting'
import { getFarmerQueueOpeningRoute } from '../quests/farmerQueueRouting'
import { setArraysCampaignStage } from '../quests/arraysCampaignStages'
import { getNpcCampaignStage, setNpcCampaignStage } from '../quests/npcCampaignStages'
import { clearKnowledgeScrolls, hasKnowledgeScroll } from '../quests/knowledgeScrolls'

function completeTopic(topic: 'arrays' | 'stack-operations' | 'queues') {
  expect(QuestManager.startTopic(topic)).toBe(true)
  expect(QuestManager.completeTopic(topic, {
    passed: true,
    masteryGrade: 'S',
    hintsUsed: 0,
  })).toBe(true)
}

function completeOldManGate() {
  expect(QuestManager.completeQuest('speak-with-elder')).toBe(true)
  expect(QuestManager.isActive('array-sorting-challenge')).toBe(true)
  expect(QuestManager.completeQuest('array-sorting-challenge')).toBe(true)
}

beforeEach(() => {
  challengeStore.closeChallenge(false)
  localStorage.clear()
  QuestManager.reset()
  clearKnowledgeScrolls()
})

describe('four-NPC main campaign and independent Knowledge Scrolls', () => {
  it('advances Elder → Guide → Samurai → Farmer without requiring any Scroll collection', () => {
    const initial = QuestManager.getCampaign()
    expect(getMainCampaignBlocker('village-guide', false, initial.topics)).toBe('elder-masanori')
    expect(getMainCampaignBlocker('dojo-samurai', false, initial.topics)).toBe('elder-masanori')
    expect(getMainCampaignBlocker('south-farmer', false, initial.topics)).toBe('elder-masanori')

    completeOldManGate()
    const afterGate = QuestManager.getCampaign()
    expect(getMainCampaignBlocker('village-guide', true, afterGate.topics)).toBeNull()
    expect(getMainCampaignBlocker('dojo-samurai', true, afterGate.topics)).toBe('village-guide')
    expect(getMainCampaignBlocker('south-farmer', true, afterGate.topics)).toBe('village-guide')

    completeTopic('arrays')
    setArraysCampaignStage('complete')
    const afterArrays = QuestManager.getCampaign()
    expect(getMainCampaignBlocker('dojo-samurai', true, afterArrays.topics)).toBeNull()
    expect(getMainCampaignBlocker('south-farmer', true, afterArrays.topics)).toBe('dojo-samurai')
    expect(getNpcCampaignStage('stack-operations')).toBe('learn')

    completeTopic('stack-operations')
    setNpcCampaignStage('stack-operations', 'complete')
    const afterStack = QuestManager.getCampaign()
    expect(getMainCampaignBlocker('south-farmer', true, afterStack.topics)).toBeNull()
    expect(getFarmerQueueOpeningRoute(afterStack.topics.queues.status, false)).toBeNull()
    expect(getNpcCampaignStage('queues')).toBe('learn')

    completeTopic('queues')
    setNpcCampaignStage('queues', 'complete')
    const finished = QuestManager.getCampaign()
    expect(finished.topics.queues.status).toBe('completed')
    expect(finished.topics['linked-lists'].status).toBe('available')
    expect(getFarmerQueueOpeningRoute(finished.topics.queues.status, false)).toBe('queue_scroll_offer')
    expect(getFarmerQueueOpeningRoute(finished.topics.queues.status, true)).toBe('queue_done')

    // Main-topic progression is complete even though no optional Scroll was required.
    expect(hasKnowledgeScroll('arrays')).toBe(false)
    expect(hasKnowledgeScroll('stack-operations')).toBe(false)
    expect(hasKnowledgeScroll('queues')).toBe(false)
  })

  it('allows Stack Scroll deferral and later collection without changing campaign mastery or rewards', () => {
    completeOldManGate()
    completeTopic('arrays')
    setArraysCampaignStage('complete')
    completeTopic('stack-operations')
    setNpcCampaignStage('stack-operations', 'complete')
    const beforeScroll = QuestManager.getCampaign()

    challengeStore.openChallenge('stack-knowledge-scroll' as ChallengeId)
    expect(challengeStore.getSnapshot().activeChallenge).toBe('stack-knowledge-scroll')
    challengeStore.closeChallenge(false)
    expect(hasKnowledgeScroll('stack-operations')).toBe(false)
    expect(QuestManager.getCampaign().topics).toEqual(beforeScroll.topics)
    expect(QuestManager.getCampaign().xp).toBe(beforeScroll.xp)
    expect(QuestManager.getCampaign().relicEntitlements).toEqual(beforeScroll.relicEntitlements)

    challengeStore.openChallenge('stack-knowledge-scroll' as ChallengeId)
    challengeStore.markKnowledgeScrollTrialComplete()
    challengeStore.closeChallenge(true)
    expect(hasKnowledgeScroll('stack-operations')).toBe(true)
    expect(QuestManager.getCampaign().topics).toEqual(beforeScroll.topics)
    expect(QuestManager.getCampaign().xp).toBe(beforeScroll.xp)
    expect(QuestManager.getCampaign().relicEntitlements).toEqual(beforeScroll.relicEntitlements)
    expect(getMainCampaignBlocker('south-farmer', true, QuestManager.getCampaign().topics)).toBeNull()
  })

  it('claims Queue independently after the Farmer topic is mastered and never changes Linked Lists unlocks', () => {
    completeOldManGate()
    completeTopic('arrays')
    setArraysCampaignStage('complete')
    completeTopic('stack-operations')
    setNpcCampaignStage('stack-operations', 'complete')
    completeTopic('queues')
    setNpcCampaignStage('queues', 'complete')
    const beforeScroll = QuestManager.getCampaign()

    challengeStore.openChallenge('queue-knowledge-scroll' as ChallengeId)
    challengeStore.markKnowledgeScrollTrialComplete()
    challengeStore.closeChallenge(true)

    expect(hasKnowledgeScroll('queues')).toBe(true)
    expect(hasKnowledgeScroll('stack-operations')).toBe(false)
    expect(QuestManager.getCampaign().topics).toEqual(beforeScroll.topics)
    expect(QuestManager.getCampaign().xp).toBe(beforeScroll.xp)
    expect(QuestManager.getCampaign().relicEntitlements).toEqual(beforeScroll.relicEntitlements)
    expect(QuestManager.getCampaign().topics['linked-lists'].status).toBe('available')
  })
})
