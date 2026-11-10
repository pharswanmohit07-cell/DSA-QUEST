import { describe, expect, it } from 'vitest'
import { CHARACTER_SKINS } from './characterSkins'
import { VILLAGE_NPCS } from '../npc/villageNpcs'
import { WORLD_NPCS } from '../npc/worldNpcs'

describe('Ninja Adventure player skin catalogue', () => {
  it('uses the pack Hunter as the first and default playable skin', () => {
    expect(CHARACTER_SKINS[0]?.id).toBe('Hunter')
    expect(CHARACTER_SKINS[0]?.name).toBe('HUNTER')
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
