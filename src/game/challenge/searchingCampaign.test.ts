import { describe, expect, it } from 'vitest'
import { applyBinarySearchStep, getBinarySearchStep, inspectLinearCandidate, isSortedAscending } from './searchingCampaign'

describe('Searching campaign mechanics', () => {
  it('checks a linear-search candidate and reports a match', () => {
    expect(inspectLinearCandidate([4, 9, 15, 23], 23, 2)).toEqual({ index: 2, value: 15, found: false })
    expect(inspectLinearCandidate([4, 9, 15, 23], 23, 3)).toEqual({ index: 3, value: 23, found: true })
  })
  it('narrows binary-search bounds after comparing the midpoint', () => {
    const values = [2, 5, 8, 12, 16, 23, 31]
    const first = getBinarySearchStep(values, 0, 6, 23)
    expect(first).toEqual({ midpoint: 3, midpointValue: 12, comparison: 'higher' })
    expect(applyBinarySearchStep(0, 6, first!)).toEqual({ low: 4, high: 6, found: false })
    const second = getBinarySearchStep(values, 4, 6, 23)
    expect(second).toEqual({ midpoint: 5, midpointValue: 23, comparison: 'match' })
    expect(applyBinarySearchStep(4, 6, second!)).toEqual({ low: 4, high: 6, found: true })
  })
  it('rejects unsorted data and invalid bounds', () => {
    expect(isSortedAscending([2, 5, 8, 12])).toBe(true)
    expect(isSortedAscending([2, 8, 5, 12])).toBe(false)
    expect(getBinarySearchStep([2, 8, 5, 12], 0, 3, 5)).toBeNull()
    expect(getBinarySearchStep([2, 5, 8], -1, 2, 5)).toBeNull()
    expect(getBinarySearchStep([2, 5, 8], 2, 1, 5)).toBeNull()
  })
})
