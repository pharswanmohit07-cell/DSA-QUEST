export type ArrayWorkshopOperation =
  | { type: 'access'; index: number }
  | { type: 'update'; index: number; value: number }
  | { type: 'insert'; index: number; value: number }
  | { type: 'delete'; index: number }
  | { type: 'append'; value: number }

export type ArrayWorkshopStep = {
  title: string
  instruction: string
  hint: string
  complexity: string
  operations: readonly ArrayWorkshopOperation[]
  allowAnyOrder?: boolean
  targetValues?: readonly number[]
}

export const ARRAY_WORKSHOP_INITIAL_VALUES: number[] = [10, 20, 30]

export const ARRAY_WORKSHOP_STEPS: readonly ArrayWorkshopStep[] = [
  {
    title: 'Find the Value',
    instruction: 'The supply ledger contains 20. Choose Access, then select the cell that stores 20.',
    hint: 'Array indexes start at 0. Read the label below each value before selecting it.',
    complexity: 'Reading a value by its index takes O(1) time.',
    operations: [{ type: 'access', index: 1 }],
  },
  {
    title: 'Change a Value',
    instruction: 'The value 20 is outdated. Replace that entry with 25.',
    hint: 'Find the cell that currently contains 20. Select Update and enter the replacement value.',
    complexity: 'Updating an existing array position takes O(1) time.',
    operations: [{ type: 'update', index: 1, value: 25 }],
  },
  {
    title: 'Insert an Element',
    instruction: 'Place 15 immediately before 25. Choose Insert, select the gap, and enter 15.',
    hint: 'The new value belongs between 10 and 25. Existing values at and after the gap move right.',
    complexity: 'Inserting in the middle takes O(n) time because later values shift right.',
    operations: [{ type: 'insert', index: 1, value: 15 }],
  },
  {
    title: 'Remove an Element',
    instruction: 'Remove the value 25 from the array. Select its cell and choose Delete.',
    hint: 'Choose the cell containing 25, not the cell before or after it.',
    complexity: 'Deleting from the middle takes O(n) time because later values shift left.',
    operations: [{ type: 'delete', index: 2 }],
  },
  {
    title: 'Master Challenge',
    instruction: 'The next shipment must read [5, 12, 15, 30, 35]. Use exactly three operations to transform the current array into that target.',
    hint: 'Compare the current array with the target. One existing value changes, one value goes between two entries, and one value is added at the end.',
    complexity: 'Update by index is O(1); middle insertion is O(n); append is amortized O(1).',
    operations: [
      { type: 'update', index: 0, value: 5 },
      { type: 'insert', index: 1, value: 12 },
      { type: 'append', value: 35 },
    ],
    allowAnyOrder: true,
    targetValues: [5, 12, 15, 30, 35],
  },
] as const

export type ArrayWorkshopOperationSuccess = {
  ok: true
  values: number[]
  accessedValue?: number
  message: string
  stageComplete: boolean
  workshopComplete: boolean
}

export type ArrayWorkshopOperationFailure = {
  ok: false
  values: number[]
  message: string
  stageComplete: false
  workshopComplete: false
}

export type ArrayWorkshopOperationResult =
  | ArrayWorkshopOperationSuccess
  | ArrayWorkshopOperationFailure

export type ArrayMutationResult =
  | { ok: true; values: number[]; accessedValue?: number; message: string }
  | { ok: false; values: number[]; message: string }

function hasValidIndex(values: readonly number[], index: number, allowEnd = false): boolean {
  return Number.isInteger(index) && index >= 0 && index < values.length + (allowEnd ? 1 : 0)
}

function sameOperation(actual: ArrayWorkshopOperation, expected: ArrayWorkshopOperation): boolean {
  if (actual.type !== expected.type) return false
  if ('index' in actual && 'index' in expected && actual.index !== expected.index) return false
  if ('value' in actual && 'value' in expected && actual.value !== expected.value) return false
  return true
}

function hasOperationAlreadyBeenApplied(
  values: readonly number[],
  operation: ArrayWorkshopOperation,
): boolean {
  switch (operation.type) {
    case 'update':
      return values[operation.index] === operation.value
    case 'insert':
      return values.includes(operation.value)
    case 'append':
      return values.at(-1) === operation.value
    case 'access':
    case 'delete':
      return false
  }
}

/** Applies a real array operation without mutating the supplied values. */
export function applyArrayOperation(
  values: readonly number[],
  operation: ArrayWorkshopOperation,
): ArrayMutationResult {
  const unchanged = [...values]

  if ('index' in operation) {
    const allowEnd = operation.type === 'insert'
    if (!hasValidIndex(unchanged, operation.index, allowEnd)) {
      const max = allowEnd ? unchanged.length : unchanged.length - 1
      return {
        ok: false,
        values: unchanged,
        message: max < 0
          ? 'The array is empty. Add a value before choosing an element.'
          : `Choose an index from 0 to ${max}.`,
      }
    }
  }

  if ('value' in operation && !Number.isFinite(operation.value)) {
    return { ok: false, values: unchanged, message: 'Enter a finite number for the value.' }
  }

  const next = [...unchanged]
  switch (operation.type) {
    case 'access':
      return {
        ok: true,
        values: next,
        accessedValue: next[operation.index],
        message: `Index ${operation.index} contains ${next[operation.index]}. Reading by index is O(1).`,
      }
    case 'update':
      next[operation.index] = operation.value
      return {
        ok: true,
        values: next,
        message: `Updated index ${operation.index} to ${operation.value}. Updating by index is O(1).`,
      }
    case 'insert':
      next.splice(operation.index, 0, operation.value)
      return {
        ok: true,
        values: next,
        message: `Inserted ${operation.value}. Later values shifted right. A middle insertion is O(n).`,
      }
    case 'delete':
      next.splice(operation.index, 1)
      return {
        ok: true,
        values: next,
        message: `Removed index ${operation.index}. Later values shifted left. A middle deletion is O(n).`,
      }
    case 'append':
      next.push(operation.value)
      return {
        ok: true,
        values: next,
        message: `Appended ${operation.value} to the end. Dynamic-array append is amortized O(1).`,
      }
  }
}

/** Validates the player's selected operation and returns the resulting array immutably. */
export function applyArrayManipulationWorkshopOperation(
  values: readonly number[],
  stepIndex: number,
  operationIndex: number,
  operation: ArrayWorkshopOperation,
): ArrayWorkshopOperationResult {
  const unchanged = [...values]
  const step = ARRAY_WORKSHOP_STEPS[stepIndex]
  if (!step) {
    return {
      ok: false,
      values: unchanged,
      message: 'The workshop has no more stages.',
      stageComplete: false,
      workshopComplete: false,
    }
  }

  if (!Number.isInteger(operationIndex) || operationIndex < 0 || operationIndex >= step.operations.length) {
    return {
      ok: false,
      values: unchanged,
      message: 'There are no more operations to perform in this stage.',
      stageComplete: false,
      workshopComplete: false,
    }
  }

  const expected = step.allowAnyOrder
    ? step.operations.find((candidate) =>
        sameOperation(operation, candidate) && !hasOperationAlreadyBeenApplied(unchanged, candidate),
      )
    : step.operations[operationIndex]

  if (!expected || !sameOperation(operation, expected)) {
    return {
      ok: false,
      values: unchanged,
      message: step.allowAnyOrder
        ? 'That move does not help reach the target array. Choose one of the remaining target changes.'
        : `Not quite. ${step.instruction}`,
      stageComplete: false,
      workshopComplete: false,
    }
  }

  const mutation = applyArrayOperation(unchanged, operation)
  if (!mutation.ok) {
    return {
      ok: false,
      values: unchanged,
      message: mutation.message,
      stageComplete: false,
      workshopComplete: false,
    }
  }

  const nextOperationIndex = operationIndex + 1
  const targetReached = step.targetValues
    ? mutation.values.length === step.targetValues.length &&
      mutation.values.every((value, index) => value === step.targetValues?.[index])
    : true

  if (step.allowAnyOrder && nextOperationIndex === step.operations.length && !targetReached) {
    return {
      ok: false,
      values: unchanged,
      message: 'That final move did not produce the target array. Your array is unchanged; try a different move.',
      stageComplete: false,
      workshopComplete: false,
    }
  }

  const stageComplete = nextOperationIndex === step.operations.length && targetReached
  return {
    ok: true,
    values: mutation.values,
    ...(mutation.accessedValue === undefined ? {} : { accessedValue: mutation.accessedValue }),
    message: mutation.message,
    stageComplete,
    workshopComplete: stageComplete && stepIndex === ARRAY_WORKSHOP_STEPS.length - 1,
  }
}

/** Backward-compatible alias for callers migrating to the scenario-based validator. */
export const applyArrayWorkshopOperation = applyArrayManipulationWorkshopOperation
