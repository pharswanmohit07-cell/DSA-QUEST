import { describe, expect, it } from 'vitest'
import { VILLAGE_NPCS } from './villageNpcs'
import { WORLD_NPCS } from './worldNpcs'

const elderTree = VILLAGE_NPCS.find((npc) => npc.id === 'elder-masanori')!.dialogueTree

const trainingNpcIds = ['village-guide', 'village-monk', 'dojo-samurai'] as const

describe('World ambient NPC definitions', () => {
  it('defines the world NPC roster with unique ids', () => {
    expect(WORLD_NPCS.length).toBe(20)
    expect(new Set(WORLD_NPCS.map((npc) => npc.id)).size).toBe(WORLD_NPCS.length)
  })

  it('keeps every world NPC out of the quest/campaign routing paths', () => {
    // Ambient world NPCs have simple single-node trees; none of them may carry
    // a route-stage node the scene routes to.
    for (const npc of WORLD_NPCS) {
      expect(Object.keys(npc.dialogueTree)).toEqual(['start'])
      expect(npc.dialogueTree.start.speaker).toBe(npc.name)
    }
  })

  it('gives every world NPC a unique texture key and idle animation', () => {
    const villageKeys = new Set(VILLAGE_NPCS.map((npc) => npc.spriteKey))
    for (const npc of WORLD_NPCS) {
      expect(villageKeys.has(npc.spriteKey), npc.id).toBe(false)
    }
    const keys = WORLD_NPCS.map((npc) => npc.spriteKey)
    const portraits = WORLD_NPCS.map((npc) => npc.portraitUrl)
    // Idle sheets: every world NPC owns its own idle texture and its own
    // faceset, so no two look like clones. (Roster: 20 ambient world NPCs.)
    expect(new Set(keys).size).toBe(keys.length)
    expect(new Set(portraits).size).toBe(portraits.length)
    expect(keys.length).toBe(20)
  })

  it('gives every NPC — village and world — a unique original character asset', () => {
    // `characterAsset` names the Ninja Adventure pack folder the NPC's art
    // comes from. Two active NPCs must never share one character: this is the
    // asset-identity guarantee, stronger than unique texture keys.
    const all = [...VILLAGE_NPCS, ...WORLD_NPCS]
    const assets = all.map((npc) => npc.characterAsset)
    expect(new Set(assets).size, JSON.stringify(assets)).toBe(assets.length)
    for (const npc of all) {
      expect(npc.characterAsset.length).toBeGreaterThan(0)
    }
  })

  it('places every world NPC at least 4 tiles from every village NPC and each other', () => {
    const all = [...VILLAGE_NPCS, ...WORLD_NPCS]
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i]
        const b = all[j]
        const dist = Math.abs(a.tileX - b.tileX) + Math.abs(a.tileY - b.tileY)
        expect(dist, `${a.id} <-> ${b.id}`).toBeGreaterThanOrEqual(4)
      }
    }
  })

  it('keeps world NPCs clear of the compound doors, spawn plaza and torii approach', () => {
    const blocked = new Set(['16,18', '21,18', '17,25', '16,25', '17,26', '12,24'])
    for (const npc of WORLD_NPCS) {
      expect(blocked.has(`${npc.tileX},${npc.tileY}`), npc.id).toBe(false)
    }
  })

  it('gives wandering world NPCs valid roam configs and unique walk prefixes', () => {
    const walkers = WORLD_NPCS.filter((npc) => npc.roam || npc.wander)
    expect(walkers.length).toBeGreaterThan(0)
    const prefixes = walkers.map((npc) => npc.walkAnimationPrefix)
    expect(new Set(prefixes).size).toBe(prefixes.length)
    for (const npc of walkers) {
      const config = npc.roam ?? npc.wander!
      expect(config.speed).toBeGreaterThan(0)
      expect(config.leashRadius).toBeGreaterThanOrEqual(48)
      expect(config.minDuration).toBeLessThanOrEqual(config.maxDuration)
      expect(config.minPause).toBeLessThanOrEqual(config.maxPause)
    }
  })

  it('keeps the two stationary world NPCs without movement configs', () => {
    for (const id of ['west-plaza-master', 'pond-ice-fisher']) {
      const npc = WORLD_NPCS.find((candidate) => candidate.id === id)
      expect(npc, id).toBeDefined()
      expect(npc!.roam).toBeUndefined()
      expect(npc!.wander).toBeUndefined()
      expect(npc!.walkSpriteKey).toBeUndefined()
    }
  })
})

describe('Village Training Route NPC definitions', () => {
  it('defines all three training NPCs with stable ids', () => {
    for (const id of trainingNpcIds) {
      expect(VILLAGE_NPCS.find((npc) => npc.id === id), `${id} should exist`).toBeDefined()
    }
    expect(VILLAGE_NPCS).toHaveLength(10)
  })

  it('gives every NPC a unique display name', () => {
    const names = VILLAGE_NPCS.map((npc) => npc.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('uses the intended pack characters per NPC', () => {
    const byId = Object.fromEntries(VILLAGE_NPCS.map((npc) => [npc.id, npc]))
    expect(byId['village-guide'].spriteKey).toBe('village-guide-idle')
    expect(byId['village-monk'].spriteKey).toBe('village-monk-idle')
    expect(byId['dojo-samurai'].spriteKey).toBe('dojo-samurai-idle')
  })

  it.each(trainingNpcIds)('%s has a dialogue tree with a valid opening node', (id) => {
    const npc = VILLAGE_NPCS.find((candidate) => candidate.id === id)!
    const opening = npc.dialogueTree[npc.dialogueTree.start.next ?? 'start']
    const root = npc.dialogueTree.start
    expect(root.speaker).toBe(npc.name)
    expect(root.text.length).toBeGreaterThan(0)
    expect(opening ?? root).toBeDefined()
  })

  it.each(trainingNpcIds)('%s has a portrait URL', (id) => {
    const npc = VILLAGE_NPCS.find((candidate) => candidate.id === id)!
    expect(npc.portraitUrl).toBeTruthy()
  })

  it.each(trainingNpcIds)('%s has a valid idle animation key', (id) => {
    const npc = VILLAGE_NPCS.find((candidate) => candidate.id === id)!
    expect(npc.idleAnimation).toBe(`${npc.id.replace(/-/g, '-')}-anim-idle-down`)
  })

  it.each(trainingNpcIds)('%s has a valid walking configuration', (id) => {
    const npc = VILLAGE_NPCS.find((candidate) => candidate.id === id)!
    expect(npc.walkSpriteKey).toBeTruthy()
    expect(npc.walkAnimationPrefix).toBeTruthy()
  })

  it('keeps the Samurai stationary at the dojo', () => {
    const samurai = VILLAGE_NPCS.find((npc) => npc.id === 'dojo-samurai')!
    expect(samurai.wander).toBeUndefined()
  })

  it('applies no tint to the real-art NPCs', () => {
    for (const id of trainingNpcIds) {
      const npc = VILLAGE_NPCS.find((candidate) => candidate.id === id)!
      expect(npc.tint).toBeUndefined()
    }
  })

  it('keeps the training NPCs away from the Elder and each other', () => {
    const byId = Object.fromEntries(VILLAGE_NPCS.map((npc) => [npc.id, npc]))
    const elder = byId['elder-masanori']
    const guide = byId['village-guide']
    const monk = byId['village-monk']
    const samurai = byId['dojo-samurai']
    const manhattan = (a: { tileX: number; tileY: number }, b: { tileX: number; tileY: number }) =>
      Math.abs(a.tileX - b.tileX) + Math.abs(a.tileY - b.tileY)
    expect(manhattan(elder, monk)).toBeGreaterThan(3)
    expect(manhattan(elder, guide)).toBeGreaterThan(3)
    expect(manhattan(elder, samurai)).toBeGreaterThan(3)
    expect(manhattan(guide, monk)).toBeGreaterThan(3)
    expect(manhattan(guide, samurai)).toBeGreaterThan(3)
    expect(manhattan(monk, samurai)).toBeGreaterThan(3)
  })

  it('exposes the route offer, report, and feedback nodes for the Guide', () => {
    const guide = VILLAGE_NPCS.find((npc) => npc.id === 'village-guide')!.dialogueTree
    for (const nodeId of [
      'route_offer',
      'route_accept_action',
      'route_later',
      'route_offer_persistence_failed',
      'route_offer_recovery_required',
      'route_active',
      'route_report',
      'route_report_action',
      'route_completed',
      'route_not_eligible',
      'route_completion_persistence_failed',
      'route_completion_recovery_required',
    ]) {
      expect(guide[nodeId], `${nodeId} should be defined`).toBeDefined()
    }
  })

  it('requires explicit Monk acknowledgement before advancing', () => {
    const monk = VILLAGE_NPCS.find((npc) => npc.id === 'village-monk')!.dialogueTree
    expect(monk['lesson_hint']?.choices).toEqual([
      { text: "I understand. I'll visit the Samurai.", next: 'lesson_ack_action' },
    ])
    // Opening nodes do not carry an advancement effect; only the
    // acknowledgement action node leads onward.
    expect(monk.start?.next).toBeNull()
    expect(monk['lesson_intro']?.next).toBe('lesson_array_hint')
  })

  it('provides stage-aware ambient/reminder nodes for Monk and Samurai', () => {
    const monk = VILLAGE_NPCS.find((npc) => npc.id === 'village-monk')!.dialogueTree
    const samurai = VILLAGE_NPCS.find((npc) => npc.id === 'dojo-samurai')!.dialogueTree
    for (const nodeId of ['route_waiting_guide', 'route_waiting_samurai', 'route_waiting_return', 'route_done']) {
      expect(monk[nodeId], `monk ${nodeId}`).toBeDefined()
    }
    for (const nodeId of [
      'trial_offer',
      'trial_start_action',
      'trial_later',
      'trial_failed',
      'trial_pass_persistence_failed',
      'trial_pass_recovery_required',
      'trial_passed',
      'trial_before_offer',
      'trial_not_ready_monk',
      'trial_already_passed',
      'route_done',
    ]) {
      expect(samurai[nodeId], `samurai ${nodeId}`).toBeDefined()
    }
  })
})

describe('Elder Northern Scouting Trip dialogue', () => {
  it('keeps the existing post-campaign acknowledgement before the new offer', () => {
    expect(elderTree.quest_done).toMatchObject({
      speaker: 'Old Man',
      text: 'The ward is down and the snowfield is open. Walk north, hunter, and do not waste the lesson.',
      next: 'northern_snowfield_offer',
    })
  })

  it('offers acceptance or Not now after the post-campaign acknowledgement', () => {
    expect(elderTree['northern_snowfield_offer']?.choices).toEqual([
      { text: 'I will scout the northern snowfield.', next: 'northern_snowfield_accept' },
      { text: 'Not now.', next: 'northern_snowfield_later' },
    ])
    expect(elderTree['northern_snowfield_later']?.next).toBeNull()
  })

  it('provides separate reminder, report, and completed dialogue states', () => {
    expect(elderTree['northern_snowfield_reminder']?.text)
      .toEqual(expect.stringMatching(/north.*snowfield/i))
    expect(elderTree['northern_snowfield_report']?.choices).toEqual([
      { text: 'I have scouted the snowfield. Here is my report.', next: 'northern_snowfield_report_action' },
    ])
    expect(elderTree['northern_snowfield_completed']?.next).toBeNull()
  })

  it('defines non-success feedback for ineligible, failed, and uncertain writes', () => {
    for (const nodeId of [
      'northern_snowfield_not_eligible',
      'northern_snowfield_persistence_failed',
      'northern_snowfield_recovery_required',
      'northern_snowfield_completion_not_eligible',
      'northern_snowfield_completion_persistence_failed',
      'northern_snowfield_completion_recovery_required',
    ]) {
      expect(elderTree[nodeId], `${nodeId} should be available`).toBeDefined()
    }
  })
})

describe('Village NPC asset uniqueness', () => {
  it('gives every NPC a unique texture spriteKey', () => {
    const keys = VILLAGE_NPCS.map((npc) => npc.spriteKey)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('gives every NPC a unique portrait import (no two NPCs share a faceset)', () => {
    const urls = VILLAGE_NPCS.map((npc) => npc.portraitUrl)
    expect(new Set(urls).size).toBe(urls.length)
  })

  it('gives every NPC a unique idle animation key', () => {
    const keys = VILLAGE_NPCS.map((npc) => npc.idleAnimation)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('ends every idle animation key with -idle-down (Phaser sheet row convention)', () => {
    for (const npc of VILLAGE_NPCS) {
      expect(npc.idleAnimation.endsWith('-idle-down')).toBe(true)
    }
  })

  it('uses distinct walk sprite keys for every wandering NPC', () => {
    const wanderers = VILLAGE_NPCS.filter((npc) => Boolean(npc.wander && npc.walkSpriteKey))
    expect(wanderers.length).toBeGreaterThan(0)
    const walkKeys = wanderers.map((npc) => npc.walkSpriteKey)
    expect(new Set(walkKeys).size).toBe(walkKeys.length)
    for (const key of walkKeys) expect(key).toBeTruthy()
  })

  it('uses distinct walk animation prefixes for every wandering NPC', () => {
    const wanderers = VILLAGE_NPCS.filter((npc) => Boolean(npc.wander && npc.walkAnimationPrefix))
    const prefixes = wanderers.map((npc) => npc.walkAnimationPrefix)
    expect(new Set(prefixes).size).toBe(prefixes.length)
    for (const prefix of prefixes) expect(prefix).toBeTruthy()
  })

  it('keeps ambient NPC dialogue simple and location-flavoured', () => {
    const ambientIds = [
      'plaza-merchant',
      'west-gate-guard',
      'shrine-shaman',
      'south-farmer',
      'laundry-resident',
      'riverside-fisher',
    ]
    for (const id of ambientIds) {
      const npc = VILLAGE_NPCS.find((candidate) => candidate.id === id)
      expect(npc, `${id} should exist`).toBeDefined()
      const root = npc!.dialogueTree.start
      expect(root.speaker).toBe(npc!.name)
      expect(root.text.length).toBeGreaterThan(0)
    }
  })

  it('keeps ambient NPCs clear of the compound entrance and spawn', () => {
    const byId = Object.fromEntries(VILLAGE_NPCS.map((npc) => [npc.id, npc]))
    // Compound door cells (16,18) and (21,18) and the spawn plaza (16,26)-ish
    // must never be occupied by an NPC body.
    const blocked = new Set(['16,18', '21,18', '17,25', '16,25', '17,26'])
    for (const npc of VILLAGE_NPCS) {
      expect(blocked.has(`${npc.tileX},${npc.tileY}`), `${npc.id} at ${npc.tileX},${npc.tileY}`).toBe(false)
    }
    void byId
  })
})

describe('Village NPC interaction-radius spacing', () => {
  it('keeps every NPC pair at least 4 tiles apart (no overlapping 48px prompt zones)', () => {
    // INTERACT_RADIUS is 48px = 3 tiles; two NPCs within 3 tiles (Manhattan)
    // can both be inside the player's prompt radius at once, and prompt
    // selection is first-match in array order — so the earlier NPC would
    // shadow the later one. Require >= 4 tiles between every pair.
    for (let i = 0; i < VILLAGE_NPCS.length; i++) {
      for (let j = i + 1; j < VILLAGE_NPCS.length; j++) {
        const a = VILLAGE_NPCS[i]
        const b = VILLAGE_NPCS[j]
        const dist = Math.abs(a.tileX - b.tileX) + Math.abs(a.tileY - b.tileY)
        expect(
          dist,
          `${a.id} and ${b.id} are only ${dist} tiles apart (need >= 4)`,
        ).toBeGreaterThanOrEqual(4)
      }
    }
  })
})
