import { describe, expect, it } from 'vitest'
import {
  advanceStackScrollRescueRound,
  applyStackScrollRescueMove,
  createStackScrollRescueState,
  retryStackScrollRescueRound,
  STACK_SCROLL_ROUNDS,
  type StackScrollRescueState,
  type StackTowerId,
} from './stackScrollRescue'

function solveHanoi(state: StackScrollRescueState, count: number, from: StackTowerId, to: StackTowerId, spare: StackTowerId): StackScrollRescueState {
  if (count === 0) return state
  state = solveHanoi(state, count - 1, from, spare, to)
  state = applyStackScrollRescueMove(state, { from, to })
  return solveHanoi(state, count - 1, spare, to, from)
}

describe('Stack Knowledge Scroll rescue', () => {
  it('starts with three towers, three scrolls and the first move budget', () => {
    const state = createStackScrollRescueState()
    expect(state.towers).toEqual({ A: [3, 2, 1], B: [], C: [] })
    expect(state.roundIndex).toBe(0)
    expect(state.moveBudget).toBe(9)
    expect(state.moveCount).toBe(0)
    expect(state.completed).toBe(false)
  })

  it('allows top-only movement and rejects moving a larger scroll onto a smaller one', () => {
    let state = createStackScrollRescueState()
    state = applyStackScrollRescueMove(state, { from: 'A', to: 'C' })
    expect(state.towers).toEqual({ A: [3, 2], B: [], C: [1] })
    const rejected = applyStackScrollRescueMove(state, { from: 'A', to: 'C' })
    expect(rejected.towers).toEqual(state.towers)
    expect(rejected.moveCount).toBe(1)
    expect(rejected.invalidActions).toBe(1)
    expect(rejected.feedback?.isError).toBe(true)
  })

  it('rejects empty-source, same-tower and over-budget moves without mutating the towers', () => {
    const state = createStackScrollRescueState()
    const empty = applyStackScrollRescueMove(state, { from: 'B', to: 'C' })
    const same = applyStackScrollRescueMove(state, { from: 'A', to: 'A' })
    expect(empty.towers).toEqual(state.towers)
    expect(same.towers).toEqual(state.towers)
    expect(empty.moveCount).toBe(0)
    expect(same.moveCount).toBe(0)
    const exhausted: StackScrollRescueState = { ...state, moveCount: state.moveBudget }
    const overBudget = applyStackScrollRescueMove(exhausted, { from: 'A', to: 'C' })
    expect(overBudget.towers).toEqual(exhausted.towers)
    expect(overBudget.moveCount).toBe(exhausted.moveBudget)
    expect(overBudget.failed).toBe(true)
  })

  it('requires the target tower to hold every scroll before the round can advance', () => {
    let state = createStackScrollRescueState()
    state = applyStackScrollRescueMove(state, { from: 'A', to: 'C' })
    expect(state.roundComplete).toBe(false)
    expect(advanceStackScrollRescueRound(state)).toBe(state)
  })

  it('uses escalating 3/4/5-scroll rounds with budgets 9/19/39 and requires all rounds', () => {
    let state = createStackScrollRescueState()
    expect(STACK_SCROLL_ROUNDS).toEqual([
      { scrollCount: 3, moveBudget: 9 },
      { scrollCount: 4, moveBudget: 19 },
      { scrollCount: 5, moveBudget: 39 },
    ])

    for (const round of STACK_SCROLL_ROUNDS) {
      state = solveHanoi(state, round.scrollCount, 'A', 'C', 'B')
      expect(state.towers.C).toHaveLength(round.scrollCount)
      expect(state.moveCount).toBeLessThanOrEqual(round.moveBudget)
      if (round.scrollCount < 5) {
        expect(state.roundComplete).toBe(true)
        state = advanceStackScrollRescueRound(state)
      }
    }
    expect(state.completed).toBe(true)
    expect(state.roundIndex).toBe(2)
  })

  it('allows retrying an exhausted round without skipping it', () => {
    const state = createStackScrollRescueState()
    const exhausted = { ...state, moveCount: state.moveBudget, failed: true }
    const retried = retryStackScrollRescueRound(exhausted)
    expect(retried.roundIndex).toBe(0)
    expect(retried.moveCount).toBe(0)
    expect(retried.moveBudget).toBe(9)
    expect(retried.failed).toBe(false)
    expect(retried.towers).toEqual({ A: [3, 2, 1], B: [], C: [] })
  })
})
