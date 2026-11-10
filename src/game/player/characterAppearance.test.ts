import { afterEach, describe, expect, it } from 'vitest'
import {
  CHARACTER_SELECTION_KEY,
  getCharacterId,
} from './characterAppearance'

afterEach(() => {
  localStorage.clear()
})

describe('Ninja Adventure hero appearance selection', () => {
  it('defaults to the Hunter hero used by the Home Screen', () => {
    expect(getCharacterId('Hero', false)).toBe('Hunter')
    expect(getCharacterId('Any Player')).toBe('Hunter')
  })

  it('restores any playable Ninja Adventure pack character from the saved profile', () => {
    localStorage.setItem(CHARACTER_SELECTION_KEY, 'NinjaRed2')
    expect(getCharacterId('Hero')).toBe('NinjaRed2')
  })

  it('migrates a character now reserved for an NPC back to Hunter', () => {
    localStorage.setItem(CHARACTER_SELECTION_KEY, 'Villager2')
    expect(getCharacterId('Hero')).toBe('Hunter')
    expect(localStorage.getItem(CHARACTER_SELECTION_KEY)).toBe('Hunter')
  })

  it('replaces the retired custom SVG skin IDs with the Hunter default', () => {
    for (const legacyId of ['ember', 'moss', 'azure']) {
      localStorage.setItem(CHARACTER_SELECTION_KEY, legacyId)
      expect(getCharacterId('Hero')).toBe('Hunter')
    }
  })
})
