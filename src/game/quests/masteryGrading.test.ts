import { describe, expect, it } from 'vitest'
import {
  calculateFinalMasteryGrade,
  finalGradeFromAverage,
  gradeArrayQuiz,
  gradeInteractiveChallenge,
  gradePoints,
  gradeStackOperations,
} from './masteryGrading'
import { CAMPAIGN_TOPICS, createInitialCampaignProgress } from './campaignDefinitions'

describe('mastery grading', () => {
  it('grades an Array quiz by correct answers', () => {
    expect([0, 1, 2, 3].map(gradeArrayQuiz)).toEqual(['D', 'B', 'A', 'S'])
  })

  it('grades Stack Operations by incorrect operations', () => {
    expect([0, 1, 2, 3, 4].map(gradeStackOperations)).toEqual(['S', 'A', 'B', 'C', 'D'])
  })

  it.each([
    [0, 0, 'S'],
    [1, 0, 'A'],
    [2, 0, 'A'],
    [3, 0, 'B'],
    [4, 0, 'B'],
    [5, 0, 'C'],
    [6, 0, 'C'],
    [7, 0, 'D'],
    [0, 1, 'A'],
    [1, 1, 'B'],
    [0, 2, 'B'],
    [0, 3, 'C'],
    [0, 4, 'D'],
  ] as const)(
    'grades interactive metrics invalidActions=%s hintsUsed=%s as %s',
    (invalidActions, hintsUsed, grade) => {
      expect(gradeInteractiveChallenge({ invalidActions, hintsUsed })).toBe(grade)
    },
  )

  it.each([
    [-1, 0],
    [0, -1],
    [1.5, 0],
    [0, 0.5],
    [Number.NaN, 0],
    [0, Number.POSITIVE_INFINITY],
  ])('rejects invalid interactive metrics %s/%s', (invalidActions, hintsUsed) => {
    expect(() => gradeInteractiveChallenge({ invalidActions, hintsUsed })).toThrow(RangeError)
  })

  it('averages all seven best topic grades for the final campaign grade', () => {
    const campaign = createInitialCampaignProgress()
    CAMPAIGN_TOPICS.forEach((topic) => {
      campaign.topics[topic.id].status = 'completed'
      campaign.topics[topic.id].bestMasteryGrade = 'A'
    })

    expect(calculateFinalMasteryGrade(campaign)).toBe('A')
    campaign.topics.trees.bestMasteryGrade = 'S'
    expect(calculateFinalMasteryGrade(campaign)).toBe('A')
    campaign.topics.arrays.bestMasteryGrade = 'S'
    expect(calculateFinalMasteryGrade(campaign)).toBe('A')
  })

  it('returns no final grade until every topic is completed and graded', () => {
    const campaign = createInitialCampaignProgress()
    for (const topic of CAMPAIGN_TOPICS) {
      campaign.topics[topic.id].status = 'completed'
      campaign.topics[topic.id].bestMasteryGrade = 'S'
    }

    expect(calculateFinalMasteryGrade(campaign)).toBe('S')
    campaign.topics.trees.bestMasteryGrade = null
    expect(calculateFinalMasteryGrade(campaign)).toBeNull()
    campaign.topics.trees.bestMasteryGrade = 'S'
    campaign.topics.trees.status = 'available'
    expect(calculateFinalMasteryGrade(campaign)).toBeNull()
  })

  it.each([
    [5, 'S'],
    [4, 'A'],
    [3, 'B'],
    [2, 'C'],
    [1, 'D'],
  ] as const)('maps grade points %s to %s', (points, grade) => {
    expect(gradePoints(grade)).toBe(points)
  })

  it.each([
    [4.5, 'S'],
    [4.49, 'A'],
    [3.5, 'A'],
    [3.49, 'B'],
    [2.5, 'B'],
    [2.49, 'C'],
    [1.5, 'C'],
    [1.49, 'D'],
    [1, 'D'],
  ] as const)('maps average %s to final grade %s', (average, grade) => {
    expect(finalGradeFromAverage(average)).toBe(grade)
  })
})
