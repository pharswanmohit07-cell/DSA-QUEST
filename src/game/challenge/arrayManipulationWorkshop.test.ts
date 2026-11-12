import { describe, expect, it } from 'vitest'
import {
  ARRAY_WORKSHOP_INITIAL_VALUES,
  ARRAY_WORKSHOP_STEPS,
  applyArrayManipulationWorkshopOperation,
  applyArrayOperation,
  type ArrayWorkshopOperation,
} from './arrayManipulationWorkshop'

describe('scenario-based Array Manipulation Workshop', () => {
  it('defines four guided stages and a three-action Master Challenge', () => {
    expect(ARRAY_WORKSHOP_STEPS.map((step) => step.title)).toEqual([
      'Find the Value',
      'Change a Value',
      'Insert an Element',
      'Remove an Element',
      'Master Challenge',
    ])
    expect(ARRAY_WORKSHOP_INITIAL_VALUES).toEqual([10, 20, 30])
    expect(ARRAY_WORKSHOP_STEPS[4]?.operations).toHaveLength(3)
    expect(ARRAY_WORKSHOP_STEPS[4]?.targetValues).toEqual([5, 12, 15, 30, 35])
  })

  it('completes four guided operations and reaches the target with three Master actions', () => {
    let values = [...ARRAY_WORKSHOP_INITIAL_VALUES]
    const guidedOperations: ArrayWorkshopOperation[] = [
      { type: 'access', index: 1 },
      { type: 'update', index: 1, value: 25 },
      { type: 'insert', index: 1, value: 15 },
      { type: 'delete', index: 2 },
    ]

    for (const [stepIndex, operation] of guidedOperations.entries()) {
      const result = applyArrayManipulationWorkshopOperation(values, stepIndex, 0, operation)
      expect(result.ok).toBe(true)
      if (!result.ok) throw new Error(result.message)
      expect(result.stageComplete).toBe(true)
      values = result.values
    }

    const masterOperations: ArrayWorkshopOperation[] = [
      { type: 'append', value: 35 },
      { type: 'insert', index: 1, value: 12 },
      { type: 'update', index: 0, value: 5 },
    ]

    for (const [operationIndex, operation] of masterOperations.entries()) {
      const result = applyArrayManipulationWorkshopOperation(values, 4, operationIndex, operation)
      expect(result.ok).toBe(true)
      if (!result.ok) throw new Error(result.message)
      values = result.values
      expect(result.stageComplete).toBe(operationIndex === 2)
      expect(result.workshopComplete).toBe(operationIndex === 2)
    }

    expect(values).toEqual([5, 12, 15, 30, 35])
  })

  it('reads a selected value without changing the array and explains O(1)', () => {
    const values = [10, 20, 30]
    const result = applyArrayManipulationWorkshopOperation(values, 0, 0, { type: 'access', index: 1 })

    expect(result).toMatchObject({
      ok: true,
      values: [10, 20, 30],
      accessedValue: 20,
      message: expect.stringContaining('O(1)'),
      stageComplete: true,
    })
    expect(values).toEqual([10, 20, 30])
  })

  it.each([
    [0, 0, { type: 'access', index: 2 }],
    [1, 0, { type: 'update', index: 0, value: 25 }],
    [2, 0, { type: 'insert', index: -1, value: 15 }],
    [2, 0, { type: 'insert', index: 9, value: 15 }],
    [3, 0, { type: 'delete', index: 9 }],
    [4, 0, { type: 'append', value: Number.NaN }],
    [4, 0, { type: 'append', value: Number.POSITIVE_INFINITY }],
  ] as Array<[number, number, ArrayWorkshopOperation]>)(
    'rejects invalid operation/index/value at stage %s without mutation',
    (stepIndex, operationIndex, operation) => {
      const values = [10, 20, 30]
      const result = applyArrayManipulationWorkshopOperation(values, stepIndex, operationIndex, operation)

      expect(result.ok).toBe(false)
      expect(result.values).toEqual(values)
      expect(result.stageComplete).toBe(false)
      expect(values).toEqual([10, 20, 30])
    },
  )


  it('allows inserting at the end and deleting an element with the expected shifts', () => {
    const inserted = applyArrayOperation([10, 20], { type: 'insert', index: 2, value: 30 })
    expect(inserted).toMatchObject({ ok: true, values: [10, 20, 30] })

    const deleted = applyArrayOperation([10, 20, 30], { type: 'delete', index: 1 })
    expect(deleted).toMatchObject({ ok: true, values: [10, 30] })
  })

  it('rejects a final Master action that cannot produce the target array without applying it', () => {
    const values = [5, 15, 30, 35]
    const result = applyArrayManipulationWorkshopOperation(
      values,
      4,
      2,
      { type: 'insert', index: 1, value: 99 },
    )

    expect(result.ok).toBe(false)
    expect(result.values).toEqual(values)
    expect(result.message).toContain('target array')
  })

  it('does not accept an already completed Master action twice', () => {
    const values = [10, 15, 30, 35]
    const result = applyArrayManipulationWorkshopOperation(
      values,
      4,
      1,
      { type: 'append', value: 35 },
    )

    expect(result.ok).toBe(false)
    expect(result.values).toEqual(values)
  })

  it('rejects operations after all five stages are complete', () => {
    const result = applyArrayManipulationWorkshopOperation(
      [5, 12, 15, 30, 35],
      5,
      0,
      { type: 'append', value: 40 },
    )

    expect(result.ok).toBe(false)
    expect(result.values).toEqual([5, 12, 15, 30, 35])
  })
})
