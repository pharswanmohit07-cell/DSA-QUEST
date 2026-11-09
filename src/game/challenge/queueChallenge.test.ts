import { beforeEach, describe, expect, it } from 'vitest'
import { challengeStore } from './challengeStore'
import type { QueueOperation } from './challengeTypes'
import { QuestManager } from '../quests/QuestManager'
import { resolveChallengeResumeOutcome } from './challengeResumeRouting'

const queueStore = challengeStore as typeof challengeStore & {
  executeQueueOp: (operation: QueueOperation) => boolean
}

function unlockQueueTopic() {
  expect(QuestManager.startTopic('arrays')).toBe(true)
  expect(QuestManager.completeTopic('arrays', {
    passed: true,
    masteryGrade: 'S',
    hintsUsed: 0,
  })).toBe(true)
  expect(QuestManager.startTopic('stack-operations')).toBe(true)
  expect(QuestManager.completeTopic('stack-operations', {
    passed: true,
    masteryGrade: 'S',
    hintsUsed: 0,
  })).toBe(true)
}

function execute(operation: QueueOperation) {
  return queueStore.executeQueueOp(operation)
}

describe('Village Supply Crisis queue challenge', () => {
  beforeEach(() => {
    localStorage.clear()
    challengeStore.closeChallenge(false)
    QuestManager.reset()
  })

  it('starts only after Stack Operations and exposes a four-slot queue', () => {
    unlockQueueTopic()
    challengeStore.openChallenge('queue-village-supply')

    const state = challengeStore.getSnapshot()
    expect(state.activeChallenge).toBe('queue-village-supply')
    expect(state.currentQueue).toEqual([])
    expect(state.queueCapacity).toBe(4)
    expect(QuestManager.getCampaign().topics.queues.status).toBe('in-progress')
  })

  it('rejects overflow, peeks without mutation, and serves every supply in FIFO order', () => {
    unlockQueueTopic()
    challengeStore.openChallenge('queue-village-supply')

    expect(execute({ type: 'enqueue', value: 12 })).toBe(true)
    expect(execute({ type: 'enqueue', value: 24 })).toBe(true)
    expect(execute({ type: 'enqueue', value: 36 })).toBe(true)
    expect(execute({ type: 'enqueue', value: 48 })).toBe(true)
    expect(challengeStore.getSnapshot().currentQueue).toEqual([12, 24, 36, 48])

    expect(execute({ type: 'enqueue', value: 60 })).toBe(true)
    expect(challengeStore.getSnapshot().currentQueue).toEqual([12, 24, 36, 48])
    expect(challengeStore.getSnapshot().feedback?.message).toMatch(/full|overflow/i)

    expect(execute({ type: 'front' })).toBe(true)
    expect(challengeStore.getSnapshot().currentQueue).toEqual([12, 24, 36, 48])
    expect(challengeStore.getSnapshot().feedback?.message).toContain('12')

    expect(execute({ type: 'rear' })).toBe(true)
    expect(challengeStore.getSnapshot().currentQueue).toEqual([12, 24, 36, 48])
    expect(challengeStore.getSnapshot().feedback?.message).toContain('48')

    expect(execute({ type: 'dequeue' })).toBe(true)
    expect(challengeStore.getSnapshot().currentQueue).toEqual([24, 36, 48])
    expect(execute({ type: 'enqueue', value: 60 })).toBe(true)
    expect(challengeStore.getSnapshot().currentQueue).toEqual([24, 36, 48, 60])
    expect(execute({ type: 'front' })).toBe(true)
    expect(execute({ type: 'rear' })).toBe(true)
    expect(execute({ type: 'dequeue' })).toBe(true)
    expect(execute({ type: 'dequeue' })).toBe(true)
    expect(execute({ type: 'dequeue' })).toBe(true)
    expect(execute({ type: 'dequeue' })).toBe(true)

    expect(challengeStore.getSnapshot().currentQueue).toEqual([])
    expect(challengeStore.getSnapshot().isComplete).toBe(true)
    challengeStore.closeChallenge(true)

    const campaign = QuestManager.getCampaign()
    expect(campaign.topics.queues.status).toBe('completed')
    expect(campaign.topics['linked-lists'].status).toBe('available')
    expect(campaign.relicEntitlements).toContain('queue-relic')
    expect(campaign.xp).toBe(150)
  })

  it('does not mutate or advance on underflow or an incorrect enqueue value', () => {
    unlockQueueTopic()
    challengeStore.openChallenge('queue-village-supply')

    expect(execute({ type: 'dequeue' })).toBe(false)
    expect(challengeStore.getSnapshot().feedback?.message).toMatch(/underflow|empty queue/i)
    expect(challengeStore.getSnapshot().currentQueue).toEqual([])
    expect(challengeStore.getSnapshot().queueStepIndex).toBe(0)

    expect(execute({ type: 'front' })).toBe(false)
    expect(challengeStore.getSnapshot().feedback?.message).toMatch(/queue is empty/i)
    expect(execute({ type: 'rear' })).toBe(false)
    expect(challengeStore.getSnapshot().feedback?.message).toMatch(/queue is empty/i)

    expect(execute({ type: 'enqueue', value: 12 })).toBe(true)
    expect(execute({ type: 'enqueue', value: 99 })).toBe(false)
    expect(challengeStore.getSnapshot().currentQueue).toEqual([12])
    expect(challengeStore.getSnapshot().queueStepIndex).toBe(1)
    expect(challengeStore.getSnapshot().incorrectOperations).toBe(2)
  })

  it('does not route Queue success through the old gate-unlock completion path', () => {
    expect(resolveChallengeResumeOutcome('queue-village-supply', true)).toBe('none')
    expect(resolveChallengeResumeOutcome('queue-village-supply', false)).toBe('none')
  })

  it('cannot claim campaign completion by closing an unfinished challenge', () => {
    unlockQueueTopic()
    challengeStore.openChallenge('queue-village-supply')
    challengeStore.closeChallenge(true)

    const campaign = QuestManager.getCampaign()
    expect(campaign.topics.queues.status).toBe('available')
    expect(campaign.topics['linked-lists'].status).toBe('locked')
    expect(campaign.relicEntitlements).not.toContain('queue-relic')
    expect(campaign.xp).toBe(100)
  })
})
