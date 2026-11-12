export type ArrayWorkshopOperation =
  | { type: 'access'; index: number }
  | { type: 'update'; index: number; value: number }
  | { type: 'insert'; index: number; value: number }
  | { type: 'delete'; index: number }
  | { type: 'append'; value: number }

export type ArrayWorkshopStep = {
  title: string
  instruction: string
  operation: ArrayWorkshopOperation
}

export const ARRAY_WORKSHOP_INITIAL_VALUES: number[] = [10, 20, 30]

export const ARRAY_WORKSHOP_STEPS: readonly ArrayWorkshopStep[] = [
  {
    title: 'Access a value',
    instruction: 'Read the value stored at index 1. Remember that indexes start at 0.',
    operation: { type: 'access', index: 1 },
  },
  {
    title: 'Update a value',
    instruction: 'Replace the value at index 1 with 25.',
    operation: { type: 'update', index: 1, value: 25 },
  },
  {
    title: 'Insert a value',
    instruction: 'Insert 15 at index 1. The values from that index onward shift right.',
    operation: { type: 'insert', index: 1, value: 15 },
  },
  {
    title: 'Delete a value',
    instruction: 'Delete the value at index 2. The values after it shift left.',
    operation: { type: 'delete', index: 2 },
  },
  {
    title: 'Append a value',
    instruction: 'Append 40 to the end of the array.',
    operation: { type: 'append', value: 40 },
  },
] as const

export type ArrayWorkshopOperationResult =
  | { ok: true; values: number[]; accessedValue?: number; message: string }
  | { ok: false; values: number[]; message: string }

function hasValidIndex(values: number[], index: number, allowEnd = false): boolean {
  return Number.isInteger(index) && index >= 0 && index < values.length + (allowEnd ? 1 : 0)
}

function sameOperation(actual: ArrayWorkshopOperation, expected: ArrayWorkshopOperation): boolean {
  if (actual.type !== expected.type) return false
  if ('index' in actual && 'index' in expected && actual.index !== expected.index) return false
  if ('value' in actual && 'value' in expected && actual.value !== expected.value) return false
  return true
}

/** Applies exactly the guided operation for this step, without mutating the input. */
export function applyArrayWorkshopOperation(
  values: readonly number[],
  stepIndex: number,
  operation: ArrayWorkshopOperation,
): ArrayWorkshopOperationResult {
  const unchanged = [...values]
  const step = ARRAY_WORKSHOP_STEPS[stepIndex]
  if (!step) {
    return { ok: false, values: unchanged, message: 'The workshop has no more steps.' }
  }

  if ('index' in operation) {
    const allowEnd = operation.type === 'insert'
    if (!hasValidIndex(unchanged, operation.index, allowEnd)) {
      const max = allowEnd ? unchanged.length : unchanged.length - 1
      if (operation.type === 'delete' && unchanged.length === 0) {
        return { ok: false, values: unchanged, message: 'The array is empty. There is no value to delete.' }
      }
      return {
        ok: false,
        values: unchanged,
        message: max < 0
          ? 'The array is empty. Add a value before choosing an index.'
          : `Choose an index from 0 to ${max}.`,
      }
    }
  }

  if ('value' in operation && !Number.isFinite(operation.value)) {
    return { ok: false, values: unchanged, message: 'Enter a finite number for the new array value.' }
  }

  if (!sameOperation(operation, step.operation)) {
    return {
      ok: false,
      values: unchanged,
      message: `Not quite. This step asks you to ${step.title.toLowerCase()}: ${step.instruction}`,
    }
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
      return { ok: true, values: next, message: `Index ${operation.index} now stores ${operation.value}.` }
    case 'insert':
      next.splice(operation.index, 0, operation.value)
      return { ok: true, values: next, message: `Inserted ${operation.value}. Later values shifted one position right.` }
    case 'delete':
      next.splice(operation.index, 1)
      return { ok: true, values: next, message: `Deleted index ${operation.index}. Later values shifted one position left.` }
    case 'append':
      next.push(operation.value)
      return { ok: true, values: next, message: `Appended ${operation.value} to the end of the array.` }
  }
}
