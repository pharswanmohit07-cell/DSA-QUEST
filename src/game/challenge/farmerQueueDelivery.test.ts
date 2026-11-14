import { beforeEach, describe, expect, it } from 'vitest'
import { challengeStore } from './challengeStore'
import { QUEUE_DELIVERY_MANIFEST, QUEUE_SUPPLY_STEPS } from './queueChallenge'
import { QuestManager } from '../quests/QuestManager'

function unlockQueuePrerequisites() {
  expect(QuestManager.startTopic('arrays')).toBe(true)
  expect(QuestManager.completeTopic('arrays', { passed: true, masteryGrade: 'S', hintsUsed: 0 })).toBe(true)
  expect(QuestManager.startTopic('stack-operations')).toBe(true)
  expect(QuestManager.completeTopic('stack-operations', { passed: true, masteryGrade: 'S', hintsUsed: 0 })).toBe(true)
}

function startIndependentDeliveryRound() {
  expect(challengeStore.openFarmerQueueLesson()).toBe(true)
  challengeStore.advanceFarmerQueueLesson()
  challengeStore.advanceFarmerQueueLesson()
  challengeStore.advanceFarmerQueueLesson()
  challengeStore.beginFarmerQueueDelivery()
  expect(challengeStore.getSnapshot().activeChallenge).toBe('queue-village-supply')

  for (const step of QUEUE_SUPPLY_STEPS) {
    expect(challengeStore.executeQueueOp(step.operation)).toBe(true)
  }
  expect(challengeStore.getSnapshot().isComplete).toBe(true)
  challengeStore.closeChallenge(true)
  expect(challengeStore.getSnapshot().activeChallenge).toBe('farmer-queue-final-quiz')

  for (const question of challengeStore.getSnapshot().quizQuestions) {
    challengeStore.answerFarmerQueueQuiz(question.correctAnswerIndex)
    challengeStore.advanceFarmerQueueQuiz()
  }
  expect(challengeStore.getSnapshot().quizStatus).toBe('passed')
  challengeStore.closeChallenge(true)
}

beforeEach(() => {
  challengeStore.closeChallenge(false)
  localStorage.clear()
  QuestManager.reset()
  unlockQueuePrerequisites()
})

describe('Farmer independent delivery round', () => {
  it('starts only after the guided queue sequence and quiz, without awarding the Queue relic', () => {
    const xpBeforeQueue = QuestManager.getCampaign().xp
    startIndependentDeliveryRound()

    expect(challengeStore.getSnapshot().activeChallenge).toBe('farmer-queue-delivery')
    expect(challengeStore.getSnapshot().currentQueue).toEqual([])
    expect(challengeStore.getSnapshot().deliveryLoadedCount).toBe(0)
    expect(QuestManager.getCampaign().topics.queues.status).toBe('in-progress')
    expect(QuestManager.getCampaign().relicEntitlements).not.toContain('queue-relic')
    expect(QuestManager.getCampaign().xp).toBe(xpBeforeQueue)
  })

  it('enforces capacity, inspects without mutation and dispatches the independent manifest in FIFO order', () => {
    startIndependentDeliveryRound()

    for (let index = 0; index < 4; index += 1) {
      expect(challengeStore.loadNextFarmerDeliveryParcel()).toBe(true)
    }
    expect(challengeStore.getSnapshot().currentQueue).toEqual([12, 24, 36, 48])
    expect(challengeStore.getSnapshot().deliveryLoadedCount).toBe(4)

    expect(challengeStore.loadNextFarmerDeliveryParcel()).toBe(false)
    expect(challengeStore.getSnapshot().currentQueue).toEqual([12, 24, 36, 48])
    expect(challengeStore.getSnapshot().feedback?.message).toMatch(/overflow|full/i)

    expect(challengeStore.inspectFarmerDeliveryFront()).toBe(true)
    expect(challengeStore.inspectFarmerDeliveryRear()).toBe(true)
    expect(challengeStore.getSnapshot().currentQueue).toEqual([12, 24, 36, 48])
    expect(challengeStore.getSnapshot().deliveredQueueValues).toEqual([])

    expect(challengeStore.dispatchFarmerDeliveryFront()).toBe(true)
    expect(challengeStore.getSnapshot().deliveredQueueValues).toEqual([12])
    expect(challengeStore.loadNextFarmerDeliveryParcel()).toBe(true)
    expect(challengeStore.getSnapshot().currentQueue).toEqual([24, 36, 48, 60])

    for (const expected of [24, 36, 48, 60]) {
      expect(challengeStore.dispatchFarmerDeliveryFront()).toBe(true)
      expect(challengeStore.getSnapshot().deliveredQueueValues.at(-1)).toBe(expected)
    }

    expect(challengeStore.getSnapshot().currentQueue).toEqual([])
    expect(challengeStore.getSnapshot().deliveredQueueValues).toEqual(
      QUEUE_DELIVERY_MANIFEST.map((parcel) => parcel.value),
    )
    expect(challengeStore.getSnapshot().isComplete).toBe(true)
  })

  it('does not award Queue completion when the independent delivery round is abandoned', () => {
    const xpBeforeQueue = QuestManager.getCampaign().xp
    startIndependentDeliveryRound()
    for (let index = 0; index < 4; index += 1) challengeStore.loadNextFarmerDeliveryParcel()
    challengeStore.closeChallenge(false)

    const campaign = QuestManager.getCampaign()
    expect(challengeStore.getSnapshot().activeChallenge).toBeNull()
    expect(campaign.topics.queues.status).not.toBe('completed')
    expect(campaign.relicEntitlements).not.toContain('queue-relic')
    expect(campaign.firstCompletionRewardClaims).not.toContain('queues')
    expect(campaign.xp).toBe(xpBeforeQueue)
  })

  it('rejects a success close while parcels are still waiting to be delivered', () => {
    const xpBeforeQueue = QuestManager.getCampaign().xp
    startIndependentDeliveryRound()
    for (let index = 0; index < 4; index += 1) {
      expect(challengeStore.loadNextFarmerDeliveryParcel()).toBe(true)
    }

    challengeStore.closeChallenge(true)

    const campaign = QuestManager.getCampaign()
    expect(challengeStore.getSnapshot().activeChallenge).toBeNull()
    expect(campaign.topics.queues.status).not.toBe('completed')
    expect(campaign.topics['linked-lists'].status).toBe('locked')
    expect(campaign.relicEntitlements).not.toContain('queue-relic')
    expect(campaign.firstCompletionRewardClaims).not.toContain('queues')
    expect(campaign.xp).toBe(xpBeforeQueue)
  })

  it('awards the Queue mastery reward only after the separate delivery objective passes', () => {
    const xpBeforeQueue = QuestManager.getCampaign().xp
    startIndependentDeliveryRound()
    for (let index = 0; index < 4; index += 1) challengeStore.loadNextFarmerDeliveryParcel()
    challengeStore.dispatchFarmerDeliveryFront()
    challengeStore.loadNextFarmerDeliveryParcel()
    for (let index = 0; index < 4; index += 1) challengeStore.dispatchFarmerDeliveryFront()

    expect(challengeStore.getSnapshot().isComplete).toBe(true)
    expect(QuestManager.getCampaign().relicEntitlements).not.toContain('queue-relic')
    challengeStore.closeChallenge(true)

    const campaign = QuestManager.getCampaign()
    expect(campaign.topics.queues.status).toBe('completed')
    expect(campaign.topics['linked-lists'].status).toBe('available')
    expect(campaign.relicEntitlements).toContain('queue-relic')
    expect(campaign.firstCompletionRewardClaims).toContain('queues')
    expect(campaign.xp).toBe(xpBeforeQueue + 50)
  })
})
