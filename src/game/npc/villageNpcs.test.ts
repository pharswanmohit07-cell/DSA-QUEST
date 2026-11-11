import { describe, expect, it } from 'vitest'
import { VILLAGE_NPCS } from './villageNpcs'
import { WORLD_NPCS } from './worldNpcs'
import { NPC_MOVEMENT_PROFILES, macroRegionForBand } from './movementProfiles'
import { npcRegionForTile } from '../map/npcSafeAreas'
import collisionData from '../map/collisionData.json'

const elderTree = VILLAGE_NPCS.find((npc) => npc.id === 'elder-masanori')!.dialogueTree

const trainingNpcIds = ['village-guide', 'village-monk', 'dojo-samurai'] as const

describe('Queue Farmer placement and interaction', () => {
  it('keeps the Farmer in the village and the armored Dojo Samurai in the dungeon', () => {
    const farmer = VILLAGE_NPCS.find((npc) => npc.id === 'south-farmer')!
    const samurai = VILLAGE_NPCS.find((npc) => npc.id === 'dojo-samurai')!

    expect([farmer.tileX, farmer.tileY]).toEqual([15, 25])
    expect(farmer.region).toBe('central-plaza')
    expect(npcRegionForTile(farmer.tileX, farmer.tileY)).toBe('central-plaza')
    expect(farmer.movement?.kind).toBe('local')
    expect(farmer.movement).toMatchObject({
      kind: 'local',
      region: 'village',
      band: 'central-plaza',
      leashRadiusTiles: 1.5,
    })

    expect([samurai.tileX, samurai.tileY]).toEqual([30, 18])
    expect(samurai.region).toBe('east-compound')
    expect(npcRegionForTile(samurai.tileX, samurai.tileY)).toBe('east-compound')
  })

  it('puts an E-advanceable Farmer line before the Queue challenge choices', () => {
    const farmer = VILLAGE_NPCS.fi¶»§q«^