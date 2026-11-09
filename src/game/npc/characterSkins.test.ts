import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { VILLAGE_NPCS } from './villageNpcs'
import { WORLD_NPCS } from './worldNpcs'

// Keep the authored folder map explicit: some in-game folder names (Elder,
// VillageGuide, Merchant, Guard, Shaman and Farmer) intentionally wrap their
// original Ninja Adventure source character folders.
const ACTIVE_NPC_SKIN_PATHS: Record<string, string> = {
  'elder-masanori': 'Elder',
  'village-guide': 'TrainingNPCs/VillageGuide',
  'village-monk': 'TrainingNPCs/Monk',
  'dojo-samurai': 'TrainingNPCs/Samurai',
  'plaza-merchant': 'VillageNPCs/Merchant',
  'west-gate-guard': 'VillageNPCs/Guard',
  'shrine-shaman': 'VillageNPCs/Shaman',
  'south-farmer': 'VillageNPCs/Farmer',
  'sand-road-traveller': 'WorldNPCs/NinjaGreen',
  'west-gate-patrol': 'WorldNPCs/Eskimo',
  'east-field-red-ninja': 'WorldNPCs/NinjaRed2',
  'south-east-blue-samurai': 'WorldNPCs/SamuraiBlue',
}

const assetRoot = resolve(process.cwd(), 'src/assets/tiles/ninja-village')

function skinFingerprint(directory: string): string {
  return ['Idle.png', 'Walk.png', 'Faceset.png']
    .map((file) => {
      const bytes = readFileSync(resolve(assetRoot, directory, file))
      return createHash('sha256').update(bytes).digest('hex')
    })
    .join(':')
}

describe('Active NPC character skins', () => {
  it('maps every active NPC to a checked-in character asset folder', () => {
    const active = [...VILLAGE_NPCS, ...WORLD_NPCS]
    expect(Object.keys(ACTIVE_NPC_SKIN_PATHS).sort()).toEqual(active.map((npc) => npc.id).sort())
    for (const npc of active) {
      expect(ACTIVE_NPC_SKIN_PATHS[npc.id], npc.id).toBeTruthy()
    }
    expect(WORLD_NPCS.find((npc) => npc.id === 'west-gate-patrol')?.characterAsset).toBe('Eskimo')
  })

  it('uses byte-distinct idle, walk and portrait art for all active NPCs', () => {
    const active = [...VILLAGE_NPCS, ...WORLD_NPCS]
    const fingerprints = active.map((npc) => ({
      id: npc.id,
      skin: skinFingerprint(ACTIVE_NPC_SKIN_PATHS[npc.id]),
    }))
    expect(
      new Set(fingerprints.map((entry) => entry.skin)).size,
      JSON.stringify(fingerprints),
    ).toBe(active.length)
  })
})
