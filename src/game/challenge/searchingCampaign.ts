export type BinarySearchStep = { midpoint: number; midpointValue: number; comparison: 'lower' | 'match' | 'higher' }

export function isSortedAscending(values: readonly number[]): boolean {
  return values.every((value, index) => index === 0 || values[index - 1] <= value)
}

export function getBinarySearchStep(values: readonly number[], low: number, high: number, target: number): BinarySearchStep | null {
  if (!Number.isFinite(target) || !isSortedAscending(values) || !Number.isInteger(low) || !Number.isInteger(high) || low < 0 || high >= values.length || low > high) return null
  const midpoint = Math.floor((low + high) / 2)
  const midpointValue = values[midpoint]
  return { midpoint, midpointValue, comparison: target < midpointValue ? 'lower' : target > midpointValue ? 'higher' : 'match' }
}

export type LinearSearchStep = { index: number; value: number; found: boolean }
export function inspectLinearCandidate(values: readonly number[], target: number, index: number): LinearSearchStep | null {
  if (!Number.isFinite(target) || !Number.isInteger(index) || index < 0 || index >= values.length) return null
  return { index, value: values[index], found: values[index] === target }
}

export function applyBinarySearchStep(low: number, high: number, step: BinarySearchStep): { low: number; high: number; found: boolean } {
  if (step.comparison === 'match') return { low, high, found: true }
  if (step.comparison === 'lower') return { low, high: step.midpoint - 1, found: false }
  return { low: step.midpoint + 1, high, found: false }
}
