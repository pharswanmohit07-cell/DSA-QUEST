/**
 * Lightweight character appearance selection for the shared Hunter animation sheet.
 *
 * A saved dsaq-character-id can explicitly select a skin. When no selection exists,
 * the player's name is hashed so the same player keeps the same appearance across
 * sessions and multiplayer clients can derive a matching tint from their name.
 */
export type CharacterId = 'ember' | 'moss' | 'azure'

const CHARACTER_TINTS: Record<CharacterId, number> = {
  ember: 0xff9870,
  moss: 0xa8d77a,
  azure: 0x73caff,
}

const CHARACTER_IDS: readonly CharacterId[] = ['ember', 'moss', 'azure']
export const CHARACTER_SELECTION_KEY = 'dsaq-character-id'

function isCharacterId(value: string | null): value is CharacterId {
  return value !== null && CHARACTER_IDS.includes(value as CharacterId)
}

export function getCharacterId(name: string, useSavedSelection = true): CharacterId {
  if (useSavedSelection && typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(CHARACTER_SELECTION_KEY)
      if (isCharacterId(saved)) return saved
    } catch {
      // Storage can be disabled; use the deterministic fallback below.
    }
  }

  let hash = 0
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) | 0
  }
  return CHARACTER_IDS[Math.abs(hash) % CHARACTER_IDS.length]
}

export function setCharacterId(characterId: CharacterId): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CHARACTER_SELECTION_KEY, characterId)
  } catch {
    // The selection still applies for the current scene if storage is unavailable.
  }
}

export function getCharacterTint(name: string, useSavedSelection = true): number {
  return CHARACTER_TINTS[getCharacterId(name, useSavedSelection)]
}
