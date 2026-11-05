import { beforeEach, describe, expect, it } from 'vitest'
import { QuestManager } from '../quests/QuestManager'
import { CAMPAIGN_TOPICS } from '../quests/campaignDefinitions'
import { getStatsSnapshot } from './playerStats'

describe('campaign profile statistics', () => {
  beforeEach(() => {
    localStorage.clear()
    QuestManager.reset()
  })

  it('reflects campaign statuses and best topic grades in the profile snapshot', () => {
    expect(QuestManager.startTopic('arrays')).toBe(true)
    expect(QuestManager.completeTopic('arrays', {
      passed: true,
      masteryGrade: 'S',
      hintsUsed: 0,
    })).toBe(true)

    const stats = getStatsSnapshot()

    expect(stats.topics.map(({ id, status }) => [id, status])).toEqual([
      ['arrays', 'done'],
      ['stack-operations', 'not-started'],
      ['queues', 'coming-soon'],
      ['linked-lists', 'coming-soon'],
      ['searching', 'coming-soon'],
      ['sorting', 'coming-soon'],
      ['trees', 'coming-soon'],
    ])
    expect(stats.topics[0].bestMasteryGrade).toBe('S')
    expect(stats.finalMasteryGrade).toBeNull()
  })

  it('shows the computed overall grade after every topic is completed', () => {
    for (const topic of CAMPAIGN_TOPICS) {
      expect(QuestManager.startTopic(topic.id)).toBe(true)
      expect(QuestManager.completeTopic(topic.id, {
        passed: true,
        masteryGrade: 'A',
        hintsUsed: 0,
      })).toBe(true)
    }

    const stats = getStatsSnapshot()
    expect(stats.finalMasteryGrade).toBe('A')
    expect(stats.topics.every((topic) => topic.status === 'done')).toBe(true)
  })
})
