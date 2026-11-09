import { describe, expect, it } from 'vitest'
import {
  AMBIENT_ROAMING_NPC_IDS,
  LOCAL_ROAMING_NPC_IDS,
  NPC_MOVEMENT_PROFILES,
  isValidAmbientProfile,
  isValidLocalProfile,
} from './movementProfiles'
import { VILLAGE_NPCS } from './villageNpcs'
import { WORLD_NPCS } from './worldNpcs'

/** All twelve NPCs covered by the hybrid roaming contract. */
const CONTRACT_IDS = [...LOCAL_ROAMING_NPC_IDS, ...AMBIENT_ROAMING_NPC_IDS]

/** Every NPC that is actually spawned by the scene. */
const ACTIVE_NPCS = [...VILLAGE_NPCS, ...WORLD_NPCS]

describe('hybrid NPC roaming contract', () => {
  it('allocates exactly four local and eight ambient NPCs', () => {
    expect(LOCAL_ROAMING_NPC_IDS).toHaveLength(4)
    expect(AMBIENT_ROAMING_NPC_IDS).toHaveLength(8)
    expect(CONTRACT_IDS).toHaveLength(12)
    expect(new Set(CONTRACT_IDS).size).toBe(12)
  })

  it('every contract NPC exists in the active spawn lists', () => {
    for (const id of CONTRACT_IDS) {
      const definition = ACTIVE_NPCS.find((npc) => npc.id === id)
      expect(definition, `NPC ${id} must exist in the active lists`).toBeDefined()
    }
  })

  it('every active NPC with a movement profile is in the contract', () => {
    for (const definition of ACTIVE_NPCS) {
      if (!definition.movement) continue
      expect(CONTRACT_IDS).toContain(definition.id)
    }
  })

  it('local NPCs carry a local profile and ambient NPCs an ambient one', () => {
    for (const id of LOCAL_ROAMING_NPC_IDS) {
      const profile = NPC_MOVEMENT_PROFILES.local[id as keyof typeof NPC_MOVEMENT_PROFILES.local]
      expect(profile, `local profile for ${id}`).toBeDefined()
      expect(profile.kind).toBe('local')
      expect(isValidLocalProfile(profile)).toBe(true)
    }
    for (const id of AMBIENT_ROAMING_NPC_IDS) {
      const profile = NPC_MOVEMENT_PROFILES.ambient[id as keyof typeof NPC_MOVEMENT_PROFILES.ambient]
      expect(profile, `ambient profile for ${id}`).toBeDefined()
      expect(profile.kind).toBe('ambient')
      expect(isValidAmbientProfile(profile)).toBe(true)
    }
  })

  it('active NPC definitions carry the right profile kind for their role', () => {
    for (const id of LOCAL_ROAMING_NPC_IDS) {
      const definition = ACTIVE_NPCS.find((npc) => npc.id === id)
      expect(definition?.movement?.kind).toBe('local')
    }
    for (const id of AMBIENT_ROAMING_NPC_IDS) {
      const definition = ACTIVE_NPCS.find((npc) => npc.id === id)
      expect(definition?.movement?.kind).toBe('ambient')
    }
  })

  it('walking NPCs have both idle and walk animation keys declared', () => {
    for (const definition of ACTIVE_NPCS) {
      if (!definition.movement) continue
      expect(definition.walkSpriteKey, `${definition.id} walkSpriteKey`).toBeDefined()
      expect(definition.walkAnimationPrefix, `${definition.id} walkAnimationPrefix`).toBeDefined()
      expect(definition.idleAnimation).toBeDefined()
    }
  })

  it('profiles never assign zero speed or negative ranges', () => {
    for (const profile of Object.values(NPC_MOVEMENT_PROFILES.local)) {
      expect(profile.speed).toBeGreaterThan(0)
      expect(profile.leashRadiusTiles).toBeGreaterThan(0)
      expect(profile.maxMoveDuration).toBeGreaterThanOrEqual(profile.minMoveDuration)
      expect(profile.maxPauseDuration).toBeGreaterThanOrEqual(profile.minPauseDuration)
    }
    for (const profile of Object.values(NPC_MOVEMENT_PROFILES.ambient)) {
      expect(profile.speed).toBeGreaterThan(0)
      expect(profile.minDestinationTiles).toBeGreaterThan(0)
      expect(profile.maxPauseDuration).toBeGreaterThanOrEqual(profile.minPauseDuration)
    }
  })

  it('local leashes stay small enough not to strand a quest interaction', () => {
    for (const profile of Object.values(NPC_MOVEMENT_PROFILES.local)) {
      expect(profile.leashRadiusTiles).toBeLessThanOrEqual(4)
    }
  })

  it('ambient destinations require a meaningful travel distance', () => {
    for (const profile of Object.values(NPC_MOVEMENT_PROFILES.ambient)) {
      expect(profile.minDestinationTiles).toBeGreaterThanOrEqual(3)
    }
  })
})
