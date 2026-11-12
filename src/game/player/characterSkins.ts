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
  name: st¶»§q«^