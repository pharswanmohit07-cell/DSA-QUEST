import { describe, expect, it } from 'vitest'
import { CHARACTER_SKINS } from './characterSkins'

describe('Ninja Adventure player skin catalogue', () => {
  it('uses the pack Hunter as the first and default playable skin', () => {
    expect(CHARACTER_SKINS[0]?.id).toBe('Hunter')
    expect(CHARACTER_SKINS[0]?.name).toBe('HUNTER')
  })

  it('exposes the 34 complete character sets already checked into this repository', () => {
    expect(CHARACTER_SKINS).toHaveLength(34)
    const ids = CHARACTER_SKINS.map((skin) => skin.id)
    expect(new Set(ids).size).toBe(34)
    expect(ids).toContain('KnightGold')
    expect(ids).toContain('NinjaGreen')
    expect(ids).toContain('NinjaRed2')
    for (const skin of CHARACTER_SKINS) {
      expect(skin.idleUrl, skin.id).toBeTruthy()
      expect(skin.walkUrl, skin.id).toBeTruthy()
    }
  })
})
