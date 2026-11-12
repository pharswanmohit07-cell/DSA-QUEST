import { describe, expect, it } from 'vitest'
import {
  ARRAY_WORKSHOP_INITIAL_VALUES,
  ARRAY_WORKSHOP_STEPS,
  applyArrayWorkshopOperation,
  type ArrayWorkshopOperation,
} from './arrayManipulationWorkshop'

describe('Array Manipulation Workshop operation rules', () => {
  it('runs the five guided operations and ends at the expected array', () => {
    let values = [...ARRAY_WORKSHOP_INITIAL_VALUES]
    const operations: ArrayWorkshopOperation[] = [
      { type: 'access', index: 1 },
      { type: 'update', index: 1, value: 25 },
      { type: 'insert', index: 1, value: 15 },
      { type: 'delete', index: 2 },
      { type: 'append', value: 40 },
    ]

    for (const [stepIndex, operation] of operations.entries()) {
      const result = applyArrayWorkshopOperation(values, stepIndex, operation)
      expect(result.ok).toBe(true)
      if (!result.ok) throw new Error(result.message)
      values = result.values
    }

    expect(values).toEqual([10, 15, 30, 40])
  })

  it('accesses by index without mutating the array', () => {
    const values = [10, 20, 30]
    const result = applyArrayWorkshopOperation(values, 0, { type: 'access', index: 1 })

    expect(result).toMatchObject({ ok: true, values: [10, 20, 30], accessedValue: 20 })
    expect(values).toEqual([10, 20, 30])
  })

  it.each([
    [{ type: 'access', index: 2 }],
    [{ type: 'update', index: -1, value: 25 }],
    [{ type: 'update', index: 3, value: 25 }],
    [{ type: 'insert', index: -1, value: 15 }],
    [{ type: 'insert', index: 9, value: 15 }],
    [{ type: 'delete', index: -1 }],
    [{ type: 'append', value: Number.NaN }],
    [{ type: 'append', value: Number.POSITIVE_INFINITY }],
  ] as Array<[ArrayWorkshopOperation]>)('rejects invalid or out-of-sequence operation %j without mutation', (operation) => {
    const values = [10, 20, 30]
    const result = applyArrayWorkshopOperation(values, 0, operation)

    expect(result.ok).toBe(false)
    expect(result.values).toEqual([10, 20, 30])
    expect(values).toEqual([10, 20, 30])
  })

  it('rejects a step outside the five-step workshop', () => {
    const result = applyArrayWorkshopOperation([10], ARRAY_WORKSHOP_STEPS.length, { type: 'append', value: 2 })
    expect(result.ok).toBe(false)
    expect(result.values).toEqual([10])
  })

  it('returns a beginner-friendly error when deleting from an empty array', () => {
    const result = applyArrayWorkshopOperation([], 3, { type: 'delete', index: 0 })
    expect(result.ok).toBe(false)
    expect(result.values).toEqual([])
    expect(result.message).toMatch(/array is empty/i)
  })
})
