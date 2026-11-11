import { describe, expect, it } from 'vitest'
import { runSolution } from './runSolution'

describe('runSolution named entry points', () => {
  it('runs a named array function without changing the existing sortArray default', () => {
    const outcome = runSolution(
      'function findLargest(numbers) { return Math.max(...numbers); }',
      (candidate) => {
        const findLargest = candidate as (numbers: number[]) => number
        const actual = findLargest([3, 9, 2])
        return [{ label: 'mixed values', passed: actual === 9, actual: String(actual), expected: '9' }]
      },
      'findLargest',
    )

    expect(outcome.ok).toBe(true)
    if (outcome.ok) expect(outcome.cases[0].passed).toBe(true)
  })
})
