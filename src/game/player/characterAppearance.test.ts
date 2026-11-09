import { beforeEach, describe, expect, it } from 'vitest'
import { CHARACTER_SELECTION_KEY, getCharacterId } from './characterAppearance'

describe('Ninja Adventure player skin selection', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults the playable hero to the Home Screen Hunter', () => {
    expect(getCharacterId('Hero')).toBe('Hunter')
  })

  it('migrates an old custom SVG skin selection to Hunter', () => {
    localStorage.setItem(CHARACTER_SELECTION_KEY, 'ember')

    expect(getCharacterId('Hero')).toBe('Hunter')
    expect(localStorage.getItem(CHARACTER_SELECTION_KEY)).toBe('Hunter')
  })

  it('restores any supported Ninja Adventure character from the saved profile', () => {
    localStorage.setItem(CHARACTER_SELECTION_KEY, 'KnightGold')

    expect(getCharacterId('Hero')).toBe('KnightGold')
  })
})
