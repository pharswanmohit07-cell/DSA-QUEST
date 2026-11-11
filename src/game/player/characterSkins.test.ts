import { describe, expect, it } from 'vitest'
import { CHARACTER_SKINS, characterDisplayName } from './characterSkins'
import { VILLAGE_NPCS } from '../npc/villageNpcs'
import { WORLD_NPCS } from '../npc/worldNpcs'

describe('Ninja Adventure player skin catalogue', () => {
  it('uses the pack Hunter as the first and default playable skin', () => {
    expect(CHARACTER_SKINS[0]?.id).toBe('Hunter')
    expect(CHARACTER_SKINS[0]?.name).toBe('Wildwood Ranger')
  })

  it('offers only complete, unique pack characters not used by active NPCs', () => {
    const ids = CHARACTER_SKINS.map((skin) => skin.id)
    expect(ids).toEqual([
      'Hunter',
      'Knight',
      'OldMan3',
      'Resident',
      'Villager4',
      'Villager6',
    ])
    const assetPairs = CHARACTER_SKINS.map((skin) => `${skin.idleUrl}|${skin.walkUrl}`)
    expect(new Set(assetPairs).size).toBe(6)
    expect(new Set(ids).size).toBe(6)

    const npcCharacterAssets = new Set(
      [...VILLAGE_NPCS, ...WORLD_NPCS].map((npc) => npc.characterAsset),
    )
    expect(ids.every((id) => !npcCharacterAssets.has(id))).toBe(true)
    expect(ids).not.toContain('VillageGuide')

    for (const skin of CHARACTER_SKINS) {
      expect(skin.idleUrl, skin.id).toBeTruthy()
      expect(skin.walkUrl, skin.id).toBeTruthy()
    }
  })
})

describe('Curated character display names', () => {
  it('maps every asset-style id to its creative Profile display name', () => {
    expect(characterDisplayName('Hunter')).toBe('Wildwood Ranger')
    expect(characterDisplayName('Knight')).toBe('Ironvale Sentinel')
    expect(characterDisplayName('OldMan3')).toBe('Elder Rowan')
    expect(characterDisplayName('Resident')).toBe('Village Artisan')
    expect(characterDisplayName('Villager4')).toBe('Meadow Guardian')
    expect(characterDisplayName('Villager6')).toBe('Orchard Keeper')
  })

  it('keeps the raw asset ids unchanged while only renaming the labels', () => {
    expect(CHARACTER_SKINS.map((skin) => skin.id)).toEqual([
      'Hunter',
      'Knight',
      'OldMan3',
      'Resident',
      'Villager4',
      'Villager6',
    ])
    expect(CHARACTER_SKINS.map((skin) => skin.name)).toEqual([
      'Wildwood Ranger',
      'Ironvale Sentinel',
      'Elder Rowan',
      'Village Artisan',
      'Meadow Guardian',
      'Orchard Keeper',
    ])
  })
})
