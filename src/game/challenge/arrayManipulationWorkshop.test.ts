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
      values =¶»§q«^