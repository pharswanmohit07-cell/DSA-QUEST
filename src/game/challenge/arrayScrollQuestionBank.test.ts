import { beforeEach, describe, expect, it } from 'vitest'
import {
  EASY_ARRAY_QUESTIONS,
  HARD_ARRAY_QUESTIONS,
  MEDIUM_ARRAY_QUESTIONS,
  resetArrayScrollQuestionHistory,
  selectArrayScrollQuestions,
} from './arrayScrollQuestionBank'

describe('randomized Knowledge Scroll questions', () => {
  beforeEach(() => resetArrayScrollQuestionHistory())

  it('selects one question from each difficulty pool', () => {
    const questions = selectArrayScrollQuestions(() => 0.1)
    expect(EASY_ARRAY_QUESTIONS).toContainEqual(questions.easy)
    expect(MEDIUM_ARRAY_QUESTIONS).toContainEqual(questions.medium)
    expect(HARD_ARRAY_QUESTIONS).toContainEqual(questions.hard)
  })

  it('does not repeat the same question in a tier on the next challenge', () => {
    const first = selectArrayScrollQuestions(() => 0)
    const second = selectArrayScrollQuestions(() => 0)
    expect(second.easy.id).not.toBe(first.easy.id)
    expect(second.medium.id).not.toBe(first.medium.id)
    expect(second.hard.id).not.toBe(first.hard.id)
  })

  it('can select different questions when the random value changes', () => {
    const first = selectArrayScrollQuestions(() => 0)
    const second = selectArrayScrollQuestions(() => 0.8)
    expect(second.easy.id).not.toBe(first.easy.id)
    expect(second.medium.id).not.toBe(first.medium.id)
    expect(second.hard.id).not.toBe(first.hard.id)
  })

  it('keeps the difficulty progression easy, medium, hard', () => {
    const questions = selectArrayScrollQuestions(() => 0.1)
    expect(questions.easy.options.length).toBeGreaterThanOrEqual(4)
    expect(questions.medium.expected.length).toBeGreaterThan(0)
    expect(questions.hard.testCases.length).toBeGreaterThanOrEqual(4)
  })
})
