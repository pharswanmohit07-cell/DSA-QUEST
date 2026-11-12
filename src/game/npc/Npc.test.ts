import { describe, expect, it } from 'vitest'
import { footprintsOverlap } from './footprintCollision'

describe('NPC footprint collision', () => {
  it('treats intersecting feet rectangles as occupied', () => {
    expect(footprintsOverlap(100, 100, 109, 107)).toBe(true)
  })

  it('allows adjacent interaction positions without overlap', () => {
    expect(footprintsOverlap(100, 100, 110, 100)).toBe(false)
    expect(footprintsOverlap(100, 100, 100, 108)).toBe(false)
  })

  it('is symmetric for NPC-to-player and NPC-to-NPC checks', () => {
    expect(footprintsOverlap(100, 100, 104, 103)).toBe(
      footprintsOverlap(104, 103, 100, 100),
    )
  })
})
