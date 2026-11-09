import { describe, expect, it } from 'vitest'
import { CHARACTER_SKINS } from './characterSkins'

describe('Ninja Adventure player skin catalogue', () => {
  it('uses the pack Hunter as the first and default playable skin', () => {
    expect(CHARACTER_SKINS[0]?.id).toBe('Hunter')
    expect(CHARACTER_SKINS[0]?.name).toBe('HUNTER')
  })

  it('exposes all 86 complete directional character sets without duplicate ids', () => {
    expect(CHARACTER_SKINS).toHaveLength(86)

    const ids = CHARACTER_SKINS.map((skin) => skin.id)
    expect(new Set(ids).size).toBe(86)
    expect(ids).toContain('KnightGold')
    expect(ids).toContain('NinjaGreen')
    expect(ids).toContain('SamuraiRed')

    for (const skin of CHARACTER_SKINS) {
      expect(skin.imageUrl, skin.id).toBeTruthy()
    }
  })
})
