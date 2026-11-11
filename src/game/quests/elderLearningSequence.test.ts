import { beforeEach, describe, expect, it } from 'vitest'
import {
  advanceElderPrologueStageForChallenge,
  clearElderPrologueStage,
  isNextElderLearningStage,
} from './elderLearningStages'

beforeEach(() => {
  localStorage.clear()
  clearElderPrologueStage()
})

describe('Old Man gate sequence', () => {
  it('requires the lesson, three-question practice, then the stack gate puzzle', () => {
    expect(isNextElderLearningStage('learn', 'practice')).toBe(true)
    expect(isNextElderLearningStage('practice', 'gate' as never)).toBe(true)
    expect(isNextElderLearningStage('gate' as never, 'complete')).toBe(true)

    expect(advanceElderPrologueStageForChallenge('array-lesson', true, false)).toBe('practice')
    expect(advanceElderPrologueStageForChallenge('array-quiz', true, false)).toBe('gate')
    expect(advanceElderPrologueStageForChallenge('array-stack-operations', true, false)).toBe('complete')
  })

  it('does not advance when any stage is failed or skipped', () => {
    expect(advanceElderPrologueStageForChallenge('array-quiz', false, false)).toBeNull()
    expect(advanceElderPrologueStageForChallenge('array-stack-operations', true, false)).toBeNull()
  })
})
