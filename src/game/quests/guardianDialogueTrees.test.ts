import { describe, expect, it } from 'vitest'
import { VILLAGE_NPCS } from '../npc/villageNpcs'
import { WORLD_NPCS } from '../npc/worldNpcs'
import { LATER_GUARDIAN_ROUTES } from './guardianRelicRouting'

const allNpcs = [...VILLAGE_NPCS, ...WORLD_NPCS]

describe('later guardian mastery and relic dialogue trees', () => {
  it.each(LATER_GUARDIAN_ROUTES)('$npcId has every campaign and relic handoff node', ({ npcId, prefix }) => {
    const npc = allNpcs.find((candidate) => candidate.id === npcId)
    expect(npc, `${npcId} exists on the village map`).toBeDefined()
    if (!npc) return

    for (const nodeId of [
      `${prefix}_campaign_locked`,
      `${prefix}_campaign_offer`,
      `${prefix}_mastery_accept`,
      `${prefix}_campaign_later`,
      `${prefix}_relic_quest_required`,
      `${prefix}_empty_scroll_required`,
      `${prefix}_relic_offer`,
      `${prefix}_relic_accept`,
      `${prefix}_relic_later`,
      `${prefix}_relic_claimed`,
    ]) {
      expect(npc.dialogueTree[nodeId], `${npcId} defines ${nodeId}`).toBeDefined()
      expect(npc.dialogueTree[nodeId]?.speaker).toBe(npc.name)
    }
  })

  it.each(LATER_GUARDIAN_ROUTES)('$npcId has separate mastery and relic choices', ({ npcId, prefix }) => {
    const npc = allNpcs.find((candidate) => candidate.id === npcId)!
    expect(npc.dialogueTree[`${prefix}_campaign_offer`]?.choices?.map((choice) => choice.next)).toEqual([
      `${prefix}_mastery_accept`,
      `${prefix}_campaign_later`,
    ])
    expect(npc.dialogueTree[`${prefix}_relic_offer`]?.choices?.map((choice) => choice.next)).toEqual([
      `${prefix}_relic_accept`,
      `${prefix}_relic_later`,
    ])
  })
})
