import { describe, expect, it } from 'vitest'
import { compareAdjacentAndSwap, isSortedAscending } from './sortingCampaign'

describe('Sorting campaign mechanics', () => {
  it('compares and swaps adjacent values only', () => {
    expect(compareAdjacentAndSwap([5, 2, 4, 1], 0)).toEqual({ values: [2, 5, 4, 1], leftValue: 5, rightValue: 2, swapped: true })
    expect(compareAdjacentAndSwap([2, 5, 4, 1], 0)).toEqual({ values: [2, 5, 4, 1], leftValue: 2, rightValue: 5, swapped: false })
  })
  it('rejects invalid indexes and detects a completed sort', () => {
    const values = [5, 2, 4]
    expect(compareAdjacentAndSwap(values, -1)).toBeNull()
    expect(compareAdjacentAndSwap(values, 2)).toBeNull()
    expect(values).toEqual([5, 2, 4])
    expect(isSortedAscending([1, 2, 3])).toBe(true)
    expect(isSortedAscending([1, 3, 2])).toBe(false)
  })
})
