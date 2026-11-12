import { beforeEach, describe, expect, it } from 'vitest'
import {
  advanceElderPrologueStageForChallenge,
  clearElderPrologueStage,
  deriveElderLearningStage,
  isNextElderLearningStage,
} from './elderLearningStages'

beforeEach(() => {
  localStorage.clear()
  clearElderPrologueStage()
})

describe('Old Man gate-only sequence', () => {
  it('routes every unfinished legacy stage to the gate trial', () => {
    expect(deriveElderLearningStage(undefined, false)).toBe('gate')
    expect(deriveElderLearningStage('learn', false)).toBe('gate')
    expect(deriveElderLearningStage('practice', false)).toBe('gate')
    expect(deriveElderLearningStage('gate', false)).toBe('gate')
  })

  it('allows only the gate stack trial to complete the Old Man progression', () => {
    expect(isNextElderLearningStage('gate', 'complete')).toBe(true)
    expect(advanceElderPrologueStageForChallenge('array-lesson', true, false)).toBeNull()
    expect(advanceElderPrologueStageForChallenge('array-quiz', true, false)).toBeNull()
    expect(advanceElderPrologueStageForChallenge('array-stack-operations', true, false))
      .toBe('complete')
  })

  it('does not complete the Old Man progression from the optional Scroll', () => {
    expect(advanceElderPrologueStageForChallenge('array-knowledge-scroll', true, false))
      .toBeNull()
  })
})
