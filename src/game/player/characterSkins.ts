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
  "Hunter": "Hunter/SeparateAnim",
  "Boy": "WorldNPCs/Boy",
  "Eskimo": "WorldNPCs/Eskimo",
  "Farmer": "VillageNPCs/Farmer",
  "Guard": "VillageNPCs/Guard",
  "Inspector": "WorldNPCs/Inspector",
  "Knight": "WorldNPCs/Knight",
  "KnightGold": "WorldNPCs/KnightGold",
  "Master": "WorldNPCs/Master",
  "Merchant": "VillageNPCs/Merchant",
  "Monk": "TrainingNPCs/Monk",
  "Monk2": "WorldNPCs/Monk2",
  "NinjaBlue": "WorldNPCs/NinjaBlue",
  "NinjaBlue2": "WorldNPCs/NinjaBlue2",
  "NinjaGreen": "WorldNPCs/NinjaGreen",
  "NinjaRed": "WorldNPCs/NinjaRed",
  "NinjaRed2": "WorldNPCs/NinjaRed2",
  "Noble": "WorldNPCs/Noble",
  "OldMan2": "WorldNPCs/OldMan2",
  "OldMan3": "WorldNPCs/OldMan3",
  "Princess": "WorldNPCs/Princess",
  "Resident": "VillageNPCs/Resident",
  "RiversideElder": "VillageNPCs/RiversideElder",
  "Samurai": "TrainingNPCs/Samurai",
  "SamuraiBlue": "WorldNPCs/SamuraiBlue",
  "Shaman": "VillageNPCs/Shaman",
  "Sultan": "WorldNPCs/Sultan",
  "VillageGuide": "TrainingNPCs/VillageGuide",
  "Villager": "WorldNPCs/Villager",
  "Villager2": "WorldNPCs/Villager2",
  "Villager4": "WorldNPCs/Villager4",
  "Villager5": "WorldNPCs/Villager5",
  "Villager6": "WorldNPCs/Villager6",
  "Woman": "WorldNPCs/Woman"
}

export type CharacterSkin = {
  id: CharacterId
  name: string
  detail: string
  imageUrl: string
  idleUrl: string
  walkUrl: string
}

function prettyName(id: string): string {
  return id.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toUpperCase()
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
  return { id, name: prettyName(id), detail: 'NINJA ADVENTURE PACK', imageUrl: idleUrl, idleUrl, walkUrl }
})
