import { describe, expect, it } from 'vitest'
import {
  ARRAY_QUESTION_BANK,
  QUEUE_QUESTION_BANK,
  STACK_QUESTION_BANK,
  selectArrayQuizQuestions,
  selectQueueQuizQuestions,
  selectStackQuizQuestions,
  selectTopicQuizQuestions,
} from './questionBank'
import type { DsaQuestionTopic } from './questionBank'

const TOPICS: readonly DsaQuestionTopic[] = ['arrays', 'stack-operations', 'queues']
const BANKS = {
  arrays: ARRAY_QUESTION_BANK,
  'stack-operations': STACK_QUESTION_BANK,
  queues: QUEUE_QUESTION_BANK,
} as const

describe('campaign DSA question banks', () => {
  it.each(TOPICS)('contains 18 complete, unique %s questions with six questions per difficulty', (topic) => {
    const bank = BANKS[topic]
    expect(bank).toHaveLength(18)
    expect(bank.filter((question) => question.difficulty === 'easy')).toHaveLength(6)
    expect(bank.filter((question) => question.difficulty === 'medium')).toHaveLength(6)
    expect(bank.filter((question) => question.difficulty === 'hard')).toHaveLength(6)
    expect(new Set(bank.map((question) => question.id)).size).toBe(18)
    expect(new Set(bank.map((question) => question.prompt.trim().toLowerCase())).size).toBe(18)
    for (const question of bank) {
      expect(question.id.trim()).not.toBe('')
      expect(question.prompt.trim()).not.toBe('')
      expect(question.explanation.trim()).not.toBe('')
      expect(question.options.length).toBeGreaterThanOrEqual(3)
      expect(question.correctAnswerIndex).toBeGreaterThanOrEqual(0)
      expect(question.correctAnswerIndex).toBeLessThan(question.options.length)
    }
  })

  it('keeps question IDs unique across all three topic banks', () => {
    const ids = TOPICS.flatMap((topic) => BANKS[topic].map((question) => question.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each([
    ['arrays', selectArrayQuizQuestions],
    ['stack-operations', selectStackQuizQuestions],
    ['queues', selectQueueQuizQuestions],
  ] as const)('selects Easy → Medium → Hard for %s', (topic, select) => {
    const selected = select([], () => 0.5)
    expect(selected).toHaveLength(3)
    expect(selected.map((question) => question.difficulty)).toEqual(['easy', 'medium', 'hard'])
    expect(new Set(selected.map((question) => question.id)).size).toBe(3)
    expect(selected.every((question) => BANKS[topic].some((entry) => entry.id === question.id))).toBe(true)
  })

  it.each(TOPICS)('avoids repeating %s questions while an unused question remains in each tier', (topic) => {
    const first = selectTopicQuizQuestions(topic, [], () => 0.2)
    const second = selectTopicQuizQuestions(topic, first.map((question) => question.id), () => 0.8)
    expect(second.every((question) => !first.some((previous) => previous.id === question.id))).toBe(true)
    expect(second.map((question) => question.difficulty)).toEqual(['easy', 'medium', 'hard'])
  })

  it('reuses a question only after its own difficulty tier has been exhausted', () => {
    const allEasyIds = ARRAY_QUESTION_BANK.filter((question) => question.difficulty === 'easy').map((question) => question.id)
    const selected = selectTopicQuizQuestions('arrays', allEasyIds, () => 0.4)
    expect(selected).toHaveLength(3)
    expect(selected.map((question) => question.difficulty)).toEqual(['easy', 'medium', 'hard'])
    expect(allEasyIds).toContain(selected[0]?.id)
  })

  it.each(TOPICS)('uses every %s question once across a complete six-attempt cycle', (topic) => {
    let used: string[] = []
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const selected = selectTopicQuizQuestions(topic, used, () => 0.37 + attempt * 0.07)
      used = [...used, ...selected.map((question) => question.id)]
    }
    expect(used).toHaveLength(18)
    expect(new Set(used).size).toBe(18)

    const nextCycle = selectTopicQuizQuestions(topic, used, () => 0.5)
    expect(nextCycle).toHaveLength(3)
    expect(new Set(nextCycle.map((question) => question.id)).size).toBe(3)
  })

  it('does not mix question IDs between topics when selecting', () => {
    const stackIds = new Set(STACK_QUESTION_BANK.map((question) => question.id))
    const queueIds = new Set(QUEUE_QUESTION_BANK.map((question) => question.id))
    expect(selectTopicQuizQuestions('stack-operations', [], () => 0.15).every((question) => stackIds.has(question.id))).toBe(true)
    expect(selectTopicQuizQuestions('queues', [], () => 0.15).every((question) => queueIds.has(question.id))).toBe(true)
  })
})
