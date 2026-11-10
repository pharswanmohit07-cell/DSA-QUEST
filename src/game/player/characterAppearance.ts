/**
 * Player appearance IDs for complete, distinct sheets not used by active village NPCs.
 * Hunter is the same hero shown on the Home Screen and is the stable default.
 */
export const CHARACTER_IDS = [
  'Hunter',
  'Knight',
  'OldMan3',
  'Resident',
  'Villager4',
  'Villager6',
] as const

export type CharacterId = (typeof CHARACTER_IDS)[number]

const CHARACTER_ID_SET: ReadonlySet<string> = new Set(CHARACTER_IDS)
export const CHARACTER_SELECTION_KEY = 'dsaq-character-id'

export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === 'string' && CHARACTER_ID_SET.has(value)
}

export function getCharacterId(_name: string, useSavedSelection = true): CharacterId {
  if (useSavedSelection && typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(CHARACTER_SELECTION_KEY)
      if (isCharacterId(saved)) return saved
      // Retire the old Ember/Moss/Azure SVG skin IDs and unknown values.
      if (saved !== null) window.localStorage.setItem(CHARACTER_SELECTION_KEY, 'Hunter')
    } catch {
      // Storage may be unavailable; use the stable pack default below.
    }
  }
  return 'Hunter'
}

export function setCharacterId(characterId: CharacterId): void {
  if (typeof window === 'undefined' || !isCharacterId(characterId)) return
  try {
    window.localStorage.setItem(CHARACTER_SELECTION_KEY, characterId)
  } catch {
    // The selection remains active for the current session if storage is unavailable.
  }
}

export function getCharacterTint(_name: string, _useSavedSelection = true): number {
  return 0xffffff
}
