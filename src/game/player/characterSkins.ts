import hunterIdleUrl from '../../assets/tiles/ninja-village/Hunter/SeparateAnim/Idle.png'
import hunterWalkUrl from '../../assets/tiles/ninja-village/Hunter/SeparateAnim/Walk.png'
import type { CharacterId } from './characterAppearance'
import { CHARACTER_IDS } from './characterAppearance'

const idleUrls = {
  ...import.meta.glob<string>('../../assets/tiles/ninja-village/TrainingNPCs/*/Idle.png', { eager: true, query: '?url', import: 'default' }),
  ...import.meta.glob<string>('../../assets/tiles/ninja-village/VillageNPCs/*/Idle.png', { eager: true, query: '?url', import: 'default' }),
  ...import.meta.glob<string>('../../assets/tiles/ninja-village/WorldNPCs/*/Idle.png', { eager: true, query: '?url', import: 'default' }),
}
const walkUrls = {
  ...import.meta.glob<string>('../../assets/tiles/ninja-village/TrainingNPCs/*/Walk.png', { eager: true, query: '?url', import: 'default' }),
  ...import.meta.glob<string>('../../assets/tiles/ninja-village/VillageNPCs/*/Walk.png', { eager: true, query: '?url', import: 'default' }),
  ...import.meta.glob<string>('../../assets/tiles/ninja-village/WorldNPCs/*/Walk.png', { eager: true, query: '?url', import: 'default' }),
}

const CHARACTER_FOLDERS: Record<CharacterId, string> = {
  Hunter: 'Hunter/SeparateAnim',
  Knight: 'WorldNPCs/Knight',
  OldMan3: 'WorldNPCs/OldMan3',
  Resident: 'VillageNPCs/Resident',
  Villager4: 'WorldNPCs/Villager4',
  Villager6: 'WorldNPCs/Villager6',
}

export type CharacterSkin = {
  id: CharacterId
  name: string
  detail: string
  imageUrl: string
  idleUrl: string
  walkUrl: string
}

/**
 * User-facing display names for each selectable character. The ids stay tied
 * to the asset folders; only these labels appear in the Profile UI.
 */
const CHARACTER_DISPLAY_NAMES: Partial<Record<CharacterId, string>> = {
  Hunter: 'Wildwood Ranger',
  Knight: 'Ironvale Sentinel',
  OldMan3: 'Elder Rowan',
  Resident: 'Village Artisan',
  Villager4: 'Meadow Guardian',
  Villager6: 'Orchard Keeper',
}

function prettyName(id: string): string {
  return id.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toUpperCase()
}

/** Display name for a character id: curated name first, pretty fallback second. */
export function characterDisplayName(id: string): string {
  return CHARACTER_DISPLAY_NAMES[id as CharacterId] ?? prettyName(id)
}

function resolvePackUrl(urls: Record<string, string>, folder: string, file: 'Idle' | 'Walk'): string {
  if (folder === 'Hunter/SeparateAnim') return file === 'Idle' ? hunterIdleUrl : hunterWalkUrl
  const path = `../../assets/tiles/ninja-village/${folder}/${file}.png`
  const url = urls[path]
  if (!url) throw new Error(`Ninja Adventure player asset is missing: ${path}`)
  return url
}

export const CHARACTER_SKINS: readonly CharacterSkin[] = CHARACTER_IDS.map((id) => {
  const folder = CHARACTER_FOLDERS[id]
  const idleUrl = resolvePackUrl(idleUrls, folder, 'Idle')
  const walkUrl = resolvePackUrl(walkUrls, folder, 'Walk')
  return { id, name: characterDisplayName(id), detail: 'NINJA ADVENTURE PACK', imageUrl: idleUrl, idleUrl, walkUrl }
})
