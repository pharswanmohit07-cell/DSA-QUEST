import emberIdleUrl from '../../assets/characters/ember-idle.svg'
import mossIdleUrl from '../../assets/characters/moss-idle.svg'
import azureIdleUrl from '../../assets/characters/azure-idle.svg'
import type { CharacterId } from './characterAppearance'

export type CharacterSkin = {
  id: CharacterId
  name: string
  detail: string
  imageUrl: string
}

export const CHARACTER_SKINS: readonly CharacterSkin[] = [
  { id: 'ember', name: 'EMBER', detail: 'CORAL / TEAL', imageUrl: emberIdleUrl },
  { id: 'moss', name: 'MOSS', detail: 'FOREST / CREAM', imageUrl: mossIdleUrl },
  { id: 'azure', name: 'AZURE', detail: 'BLUE / SILVER', imageUrl: azureIdleUrl },
]
