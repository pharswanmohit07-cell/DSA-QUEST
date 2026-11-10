import playerSkinAtlasUrl from '../../assets/characters/player-skin-atlas.png'
import type { CharacterId } from './characterAppearance'
import { CHARACTER_IDS } from './characterAppearance'

export const CHARACTER_SKIN_ATLAS_URL = playerSkinAtlasUrl
export const CHARACTER_SKIN_FRAME_WIDTH = 16
export const CHARACTER_SKIN_FRAME_HEIGHT = 16
export const CHARACTER_SKIN_ROWS_PER_CHARACTER = 5
export const CHARACTER_SKIN_FRAMES_PER_CHARACTER = 20
export const CHARACTER_SKIN_ATLAS_ROW_COUNT =
  CHARACTER_IDS.length * CHARACTER_SKIN_ROWS_PER_CHARACTER

export type CharacterSkin = {
  id: CharacterId
  name: string
  detail: string
  imageUrl: string
  spriteIndex: number
}

function prettyName(id: string): string {
  return id.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toUpperCase()
}

export function getIdleFrameIndex(spriteIndex: number, directionColumn: number): number {
  return spriteIndex * CHARACTER_SKIN_FRAMES_PER_CHARACTER + directionColumn
}

export function getWalkFrameIndex(
  spriteIndex: number,
  walkFrame: number,
  directionColumn: number,
): number {
  return spriteIndex * CHARACTER_SKIN_FRAMES_PER_CHARACTER + 4 + walkFrame * 4 + directionColumn
}

export function getCharacterAtlasRowPosition(spriteIndex: number, rowWithinCharacter: number): number {
  const row = spriteIndex * CHARACTER_SKIN_ROWS_PER_CHARACTER + rowWithinCharacter
  return (row / (CHARACTER_SKIN_ATLAS_ROW_COUNT - 1)) * 100
}

export const CHARACTER_SKINS: readonly CharacterSkin[] = CHARACTER_IDS.map((id, spriteIndex) => ({
  id,
  name: prettyName(id),
  detail: 'NINJA ADVENTURE PACK',
  imageUrl: CHARACTER_SKIN_ATLAS_URL,
  spriteIndex,
}))
