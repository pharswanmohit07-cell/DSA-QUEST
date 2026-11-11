import { describe, expect, it } from 'vitest'
import { ARRAY_QUESTION_BANK, selectArrayQuizQuestions } from './questionBank'

describe('optional Arrays Knowledge Scroll rounds', () => {
  it('has distinct easy, medium and hard questions', () => {
    expect(ARRAY_QUESTION_BANK.some((question) => question.difficulty === 'easy')).toBe(true)
    expect(ARRAY_QUESTION_BANK.some((question) => question.difficulty === 'medium')).toBe(true)
    expect(ARRAY_QUESTION_BANK.some((question) => question.difficulty === 'hard')).toBe(true)
  })

  it('selects exactly one round in easy, medium, hard order', () => {
    const selected = selectArrayQuizQuestions([], () => 0.5)
    expect(selected.map((question) => question.difficulty)).toEqual(['easy', 'medium', 'hard'])
    expect(new Set(selected.map((question) => question.id)).size).toBe(3)
  })

  it('avoids repeating question IDs while alternatives in that tier remain', () => {
    const first = selectArrayQuizQuestions([], () => 0.2)
    const second = selectArrayQuizQuestions(first.map((question) => question.id), () => 0.8)
    expect(second.every((question) => !first.some((seen) => seen.id === question.id))).toBe(true)
    expect(second.map((question) => question.difficulty)).toEqual(['easy', 'medium', 'hard'])
  })

  it('reuses a tier only after that tier is exhausted', () => {
    const first = selectArrayQuizQuestions([], () => 0)
    const allIds = ARRAY_QUESTION_BANK.filter((question) => question.difficulty === 'easy').map((quest¶»§q«^