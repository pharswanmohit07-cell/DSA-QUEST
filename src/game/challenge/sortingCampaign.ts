export type BubbleSortStepResult = { values: number[]; leftValue: number; rightValue: number; swapped: boolean }

export function compareAdjacentAndSwap(values: readonly number[], index: number): BubbleSortStepResult | null {
  if (!Number.isInteger(index) || index < 0 || index >= values.length - 1) return null
  const nextValues = [...values]
  const leftValue = nextValues[index]
  const rightValue = nextValues[index + 1]
  const swapped = leftValue > rightValue
  if (swapped) {
    nextValues[index] = rightValue
    nextValues[index + 1] = leftValue
  }
  return { values: nextValues, leftValue, rightValue, swapped }
}

export function isSortedAscending(values: readonly number[]): boolean {
  return values.every((value, index) => index === 0 || values[index - 1] <= value)
}
