import { describe, expect, it } from 'vitest'
import { isInsideNorthernSnowfieldTrigger } from './northernSnowfieldTrigger'

describe('Northern Snowfield visit trigger', () => {
  it.each([
    ['north-west corner', 184, 272],
    ['north-east corner', 216, 272],
    ['south-west corner', 184, 304],
    ['south-east corner', 216, 304],
    ['center', 200, 288],
  ])('includes the %s bound', (_label, x, bottom) => {
    expect(isInsideNorthernSnowfieldTrigger({ center: { x }, bottom })).toBe(true)
  })

  it.each([
    ['west of the region', 183.99, 288],
    ['east of the region', 216.01, 288],
    ['north of the region', 200, 271.99],
    ['south of the region', 200, 304.01],
    ['southern approach at the gate', 200, 320],
  ])('rejects a point %s', (_label, x, bottom) => {
    expect(isInsideNorthernSnowfieldTrigger({ center: { x }, bottom })).toBe(false)
  })
})
