import { beforeEach, describe, expect, it } from 'vitest'
import { CAMPAIGN_TOPICS } from './campaignDefinitions'
import { QuestManager } from './QuestManager'
import type { CampaignTopicId } from './questTypes'

const successfulResult = {
  passed: true,
  masteryGrade: 'A' as const,
  hintsUsed: 0,
}

function completeTopic(id: CampaignTopicId) {
  expect(QuestManager.startTopic(id)).toBe(true)
  expect(QuestManager.completeTopic(id, successfulResult)).toBe(true)
}

describe('campaign progression rules', () => {
  beforeEach(() => {
    localStorage.clear()
    QuestManager.reset()
  })

  it('makes only Arrays available at the start', () => {
    const campaign = QuestManager.getCampaign()

    expect(CAMPAIGN_TOPICS.map((topic) => topic.displayName)).toEqual([
      'Arrays',
      'Stack Operations',
      'Queues',
      'Linked Lists',
      'Searching',
      'Sorting',
      'Trees',
    ])
    expect(Object.values(campaign.topics).map((topic) => topic.status)).toEqual([
      'available',
      'locked',
      'locked',
      'locked',
      'locked',
      'locked',
      'locked',
    ])
    expect(QuestManager.startTopic('stack-operations')).toBe(false)
  })

  it('unlocks Stack Operations after Arrays and unlocks all topics sequentially', () => {
    completeTopic('arrays')
    expect(QuestManager.getCampaign().topics['stack-operations'].status).toBe('available')
    expect(QuestManager.getCampaign().topics.queues.status).toBe('locked')

    for (const topic of CAMPAIGN_TOPICS.slice(1)) {
      expect(QuestManager.startTopic(topic.id)).toBe(true)
      expect(QuestManager.completeTopic(topic.id, successfulResult)).toBe(true)
      const next = CAMPAIGN_TOPICS[CAMPAIGN_TOPICS.indexOf(topic) + 1]
      if (next) expect(QuestManager.getCampaign().topics[next.id].status).toBe('available')
    }
  })

  it('allows failed and interrupted topics to be retried', () => {
    expect(QuestManager.startTopic('arrays')).toBe(true)
    expect(QuestManager.completeTopic('arrays', {
      passed: false,
      masteryGrade: 'D',
      hintsUsed: 2,
    })).toBe(false)
    expect(QuestManager.getCampaign().topics.arrays.status).toBe('available')

    expect(QuestManager.startTopic('arrays')).toBe(true)
    expect(QuestManager.getCampaign().topics.arrays.status).toBe('in-progress')
    expect(QuestManager.startTopic('arrays')).toBe(true)
    expect(QuestManager.getCampaign().topics.arrays.attemptCount).toBe(3)
  })

  it('records an attempt on start and awards first-completion rewards on completion', () => {
    expect(QuestManager.startTopic('arrays')).toBe(true)
    expect(QuestManager.getCampaign().topics.arrays.attemptCount).toBe(1)
    expect(QuestManager.getCampaign().topics.arrays.status).toBe('in-progress')

    expect(QuestManager.completeTopic('arrays', successfulResult)).toBe(true)
    expect(QuestManager.getCampaign().topics.arrays.status).toBe('completed')
    expect(QuestManager.getCampaign().xp).toBe(50)
    expect(QuestManager.getCampaign().relicEntitlements).toEqual(['array-relic'])
  })

  it('rejects restoring an in-progress topic with zero attempts without awarding rewards', () => {
    expect(QuestManager.save()).toBe(true)
    const impossibleSave = QuestManager.getSave()
    expect(impossibleSave).not.toBeNull()
    if (!impossibleSave) return
    impossibleSave.topics.arrays.status = 'in-progress'
    impossibleSave.activeTopicId = 'arrays'
    impossibleSave.topics.arrays.attemptCount = 0

    QuestManager.restore(impossibleSave)

    expect(QuestManager.getCampaign().topics.arrays.status).toBe('available')
    expect(QuestManager.getCampaign().topics.arrays.attemptCount).toBe(0)
    expect(QuestManager.getCampaign().activeTopicId).toBeNull()
    expect(QuestManager.completeTopic('arrays', successfulResult)).toBe(false)
    expect(QuestManager.getCampaign().xp).toBe(0)
    expect(QuestManager.getCampaign().relicEntitlements).toEqual([])
  })

  it('rejects direct completion of an available topic', () => {
    expect(QuestManager.completeTopic('arrays', successfulResult)).toBe(false)
    expect(QuestManager.getCampaign().topics.arrays.status).toBe('available')
    expect(QuestManager.getCampaign().xp).toBe(0)
    expect(QuestManager.getCampaign().relicEntitlements).toEqual([])
  })

  it('rejects completion of a locked topic during another topic attempt', () => {
    expect(QuestManager.startTopic('arrays')).toBe(true)
    expect(QuestManager.completeTopic('stack-operations', successfulResult)).toBe(false)
    expect(QuestManager.getCampaign().topics['stack-operations'].status).toBe('locked')
    expect(QuestManager.getCampaign().xp).toBe(0)
  })

  it('allows completed topics to be replayed without duplicate XP or relics', () => {
    completeTopic('arrays')
    const once = QuestManager.getCampaign()

    expect(QuestManager.startTopic('arrays')).toBe(true)
    expect(QuestManager.completeTopic('arrays', {
      passed: true,
      masteryGrade: 'S',
      hintsUsed: 1,
    })).toBe(true)
    expect(QuestManager.completeTopic('arrays', successfulResult)).toBe(false)

    const replayed = QuestManager.getCampaign()
    expect(replayed.xp).toBe(once.xp)
    expect(replayed.relicEntitlements).toEqual(once.relicEntitlements)
    expect(replayed.firstCompletionRewardClaims).toEqual(['arrays'])
    expect(replayed.topics.arrays.bestMasteryGrade).toBe('S')
  })

  it('does not regress a completed topic when its replay fails', () => {
    completeTopic('arrays')
    const completed = QuestManager.getCampaign()

    expect(QuestManager.startTopic('arrays')).toBe(true)
    expect(QuestManager.completeTopic('arrays', {
      passed: false,
      masteryGrade: 'D',
      hintsUsed: 1,
    })).toBe(false)

    const replayed = QuestManager.getCampaign()
    expect(replayed.topics.arrays.status).toBe('completed')
    expect(replayed.topics.arrays.bestMasteryGrade).toBe(completed.topics.arrays.bestMasteryGrade)
    expect(replayed.xp).toBe(completed.xp)
    expect(replayed.relicEntitlements).toEqual(completed.relicEntitlements)
  })

  it('does not let skipping the opening story complete a topic, award a relic, XP, or unlock the legacy gate', () => {
    const before = QuestManager.getCampaign()

    expect(QuestManager.markOpeningStorySeen('skipped', 'opening-v1')).toBe(true)

    const after = QuestManager.getCampaign()
    expect(after.openingStory).toEqual({ status: 'skipped', storyVersion: 'opening-v1' })
    expect(after.topics).toEqual(before.topics)
    expect(after.xp).toBe(before.xp)
    expect(after.relicEntitlements).toEqual([])
    expect(QuestManager.isCompleted('array-sorting-challenge')).toBe(false)
  })

  it('does not award topic completion, XP, or relics for completing the opening story', () => {
    const before = QuestManager.getCampaign()

    expect(QuestManager.markOpeningStorySeen('completed', 'opening-v1')).toBe(true)

    const after = QuestManager.getCampaign()
    expect(after.topics).toEqual(before.topics)
    expect(after.xp).toBe(before.xp)
    expect(after.relicEntitlements).toEqual([])
    expect(QuestManager.isCompleted('array-sorting-challenge')).toBe(false)
  })

  it('blocks the relic-return ceremony until all seven relics have been earned', () => {
    expect(QuestManager.completeRelicReturn()).toBe(false)
    for (const topic of CAMPAIGN_TOPICS) completeTopic(topic.id)

    expect(QuestManager.getCampaign().relicEntitlements).toHaveLength(7)
    expect(QuestManager.completeRelicReturn()).toBe(true)
    expect(QuestManager.completeCampaign()).toBe(true)
    expect(QuestManager.getCampaign().epilogueStatus).toBe('completed')
  })

  it('does not complete the campaign before the ceremony', () => {
    for (const topic of CAMPAIGN_TOPICS) completeTopic(topic.id)

    expect(QuestManager.completeCampaign()).toBe(false)
    expect(QuestManager.getCampaign().epilogueStatus).toBe('not-started')
  })
})
