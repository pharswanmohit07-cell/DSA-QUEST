import { describe, expect, it } from 'vitest'
import {
  applySamuraiStackAction,
  beginSamuraiFinalTrial,
  createSamuraiStackProgress,
  enterSamuraiPractice,
  applySamuraiStackHint,
  SAMURAI_GUIDED_STEPS,
} from './samuraiStackChallenge'

function preparedPracticeState() {
  let state = createSamuraiStackProgress()
  for (const step of SAMURAI_GUIDED_STEPS) {
    state = applySamuraiStackAction(state, step.action)
  }
  return enterSamuraiPractice(state)
}

describe('Samurai Dojo Scroll Tower', () => {
  it('starts with an empty guided tower', () => {
    const state = createSamuraiStackProgress()
    expect(state.mode).toBe('guided')
    expect(state.stack).toEqual([])
    expect(state.guidedStepIndex).toBe(0)
    expect(state.completed).toBe(false)
  })

  it('rejects an out-of-order guided action without changing the stack', () => {
    const state = createSamuraiStackProgress()
    const next = applySamuraiStackAction(state, { type: 'pop' })
    expect(next.stack).toEqual([])
    expect(next.guidedStepIndex).toBe(0)
    expect(next.invalidActions).toBe(1)
    expect(next.feedback?.isError).toBe(true)
  })

  it('teaches Push, Peek and Pop through the full guided sequence', () => {
    let state = createSamuraiStackProgress()
    state = applySamuraiStackAction(state, { type: 'push', scrollId: 'river' })
    state = applySamuraiStackAction(state, { type: 'push', scrollId: 'mountain' })
    state = applySamuraiStackAction(state, { type: 'peek' })
    expect(state.stack).toEqual(['river', 'mountain'])
    expect(state.feedback?.message).toContain('Mountain')
    state = applySamuraiStackAction(state, { type: 'pop' })
    state = applySamuraiStackAction(state, { type: 'peek' })
    expect(state.stack).toEqual(['river'])
    expect(state.guidedStepIndex).toBe(5)
    expect(state.feedback?.message).toContain('River')
  })

  it('allows free Push, Peek and Pop in Practice Mode', () => {
    let state = preparedPracticeState()
    expect(state.mode).toBe('practice')
    state = applySamuraiStackAction(state, { type: 'push', scrollId: 'moon' })
    state = applySamuraiStackAction(state, { type: 'peek' })
    expect(state.feedback?.message).toContain('Moon')
    expect(state.stack).toEqual(['moon'])
    state = applySamuraiStackAction(state, { type: 'pop' })
    expect(state.stack).toEqual([])
  })

  it('counts empty-stack Pop as an invalid action', () => {
    let state = preparedPracticeState()
    state = applySamuraiStackAction(state, { type: 'pop' })
    expect(state.invalidActions).toBe(1)
    expect(state.stack).toEqual([])
    expect(state.feedback?.message.toLowerCase()).toContain('underflow')
  })

  it('starts the final trial with the Lotus scroll buried below two blockers', () => {
    let state = preparedPracticeState()
    state = applySamuraiStackAction(state, { type: 'push', scrollId: 'moon' })
    state = beginSamuraiFinalTrial(state)
    expect(state.mode).toBe('final')
    expect(state.stack).toEqual(['phoenix', 'lotus', 'ember', 'frost'])
    expect(state.hasPeekedTarget).toBe(false)
    expect(state.completed).toBe(false)
  })

  it('requires Peek when Lotus reaches the top before the player can recover it', () => {
    let state = beginSamuraiFinalTrial(preparedPracticeState())
    state = applySamuraiStackAction(state, { type: 'pop' })
    state = applySamuraiStackAction(state, { type: 'pop' })
    const before = [...state.stack]
    state = applySamuraiStackAction(state, { type: 'pop' })
    expect(state.stack).toEqual(before)
    expect(state.hasPeekedTarget).toBe(false)
    expect(state.invalidActions).toBe(1)
  })

  it('recovers Lotus with Peek and Pop while preserving the bottom Phoenix scroll', () => {
    let state = beginSamuraiFinalTrial(preparedPracticeState())
    state = applySamuraiStackAction(state, { type: 'pop' })
    state = applySamuraiStackAction(state, { type: 'pop' })
    expect(state.stack).toEqual(['phoenix', 'lotus'])
    state = applySamuraiStackAction(state, { type: 'peek' })
    expect(state.stack).toEqual(['phoenix', 'lotus'])
    expect(state.hasPeekedTarget).toBe(true)
    state = applySamuraiStackAction(state, { type: 'pop' })
    expect(state.completed).toBe(true)
    expect(state.stack).toEqual(['phoenix'])
  })

  it('records optional hints for deterministic mastery grading', () => {
    const state = applySamuraiStackHint(createSamuraiStackProgress())
    expect(state.hintsUsed).toBe(1)
    expect(state.feedback?.isError).toBe(false)
  })
})
