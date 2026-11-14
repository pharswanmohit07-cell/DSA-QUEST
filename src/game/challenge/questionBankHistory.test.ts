import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  readTopicQuestionHistory,
  writeTopicQuestionHistory,
} from './questionBankHistory'

beforeEach(() => {
  localStorage.clear()
})

describe('topic-scoped question history', () => {
  it('preserves the legacy Arrays history key for existing saves', () => {
    writeTopicQuestionHistory('arrays', ['starting-index', 'first-value', 'starting-index'])
    expect(localStorage.getItem('dsa-quest-array-quiz-history-v1')).toBe(
      JSON.stringify(['starting-index', 'first-value']),
    )
    expect(readTopicQuestionHistory('arrays')).toEqual(['starting-index', 'first-value'])
  })

  it('stores Stack Operations and Queues histories separately', () => {
    writeTopicQuestionHistory('stack-operations', ['stack-lifo', 'stack-push'])
    writeTopicQuestionHistory('queues', ['queue-fifo', 'queue-enqueue'])

    expect(readTopicQuestionHistory('stack-operations')).toEqual(['stack-lifo', 'stack-push'])
    expect(readTopicQuestionHistory('queues')).toEqual(['queue-fifo', 'queue-enqueue'])
    expect(readTopicQuestionHistory('arrays')).toEqual([])
  })

  it('returns an empty history for malformed saved data without throwing', () => {
    localStorage.setItem('dsa-quest-stack-quiz-history-v1', '{broken')
    expect(readTopicQuestionHistory('stack-operations')).toEqual([])
  })

  it('safely ignores unavailable browser storage', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    expect(readTopicQuestionHistory('queues')).toEqual([])
    expect(() => writeTopicQuestionHistory('queues', ['queue-fifo'])).not.toThrow()
    getItem.mockRestore()
    setItem.mockRestore()
  })
})
