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
    instruction: 'The quartermaster needs the second entry from this shipment. Retrieve it without changing the row.',
    hint: 'Array indexes start at 0. Read the label below each value before selecting it.',
    complexity: 'Reading a value by its index takes O(1) time.',
    operations: [{ type: 'access', index: 1 }],
  },
  {
    title: 'Change a Value',
    instruction: 'A correction notice has arrived. Make the live array match the reference shipment.',
    hint: 'Find the cell that currently contains 20. Select Update and enter the replacement value.',
    complexity: 'Updating an existing array position takes O(1) time.',
    operations: [{ type: 'update', index: 1, value: 25 }],
    targetValues: [10, 25, 30],
  },
  {
    title: 'Insert an Element',
    instruction: 'The shipment is missing one crate between its first two entries¶»§q«^