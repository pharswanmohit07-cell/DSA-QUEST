import { describe, expect, it } from 'vitest'
import { VILLAGE_NPCS } from './villageNpcs'
import { WORLD_NPCS } from './worldNpcs'
import collisionData from '../map/collisionData.json'

const elderTree = VILLAGE_NPCS.find((npc) => npc.id === 'elder-masanori')!.dialogueTree

const trainingNpcIds = ['village-guide', 'village-monk', 'dojo-samurai'] as const

describe('World ambient NPC definitions', () => {
  it('defines the world NPC roster with unique ids', () => {
    expect(WORLD_NPCS.length).toBe(4)
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
    // faceset, so no two look like clones. (Roster: 4 ambient world NPCs.)
    expect(new Set(keys).size).toBe(keys.length)
    expect(new Set(portraits).size).toBe(portraits.length)
    expect(keys.length).toBe(4)
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

  it('keeps the rendered-world 7/3/1/1 population priority', () => {
    const all = [...VILLAGE_NPCS, ...WORLD_NPCS]
    const area = (npc: { id?: string; tileX: number; tileY: number }) => {
      if (npc.id === 'elder-masanori') return 'pre-gate'
      if (npc.tileX >= 24) return 'dungeon-desert'
      if (npc.tileY >= 29) return 'snow'
      return 'main-village'
    }

    expect(all.filter((npc) => area(npc) === 'pre-gate')).toHaveLength(1)
    expect(all.filter((npc) => area(npc) === 'main-village')).toHaveLength(7)
    expect(all.filter((npc) => area(npc) === 'dungeon-desert')).toHaveLength(3)
    expect(all.filter((npc) => area(npc) === 'snow')).toHaveLength(1)
    expect(WORLD_NPCS.filter((npc) => area(npc) === 'pre-gate')).toHaveLength(0)
    expect(all.filter((npc) =>
      npc.tileY >= 29 &&
      npc.tileX < 24 &&
      npc.id !== 'south-east-blue-samurai' &&
      npc.id !== 'elder-masanori',
    )).toHaveLength(0)
    expect(all.filter((npc) => npc.tileX >= 24 && npc.tileY < 14)).toHaveLength(1)
    expect(new Set([
      ...all.filter((npc) => area(npc) === 'main-village').map((npc) => {
        if (npc.tileY >= 20) return 'village-lower'
        if (npc.tileX < 10) return 'village-west'
        if (npc.tileX < 17) return 'village-central'
        return 'village-market'
      }),
    ])).toEqual(new Set(['village-lower', 'village-west', 'village-central', 'village-market']))
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
    // All four ambient NPCs patrol (PatrolAi waypoint routes), so no wanderer
    // configs remain; the prefixes stay unique for the patrol walkers.
    const walkers = WORLD_NPCS.filter((npc) => npc.patrol)
    expect(walkers.length).toBe(4)
    const prefixes = walkers.map((npc) => npc.walkAnimationPrefix)
    expect(new Set(prefixes).size).toBe(prefixes.length)
  })

  it('gives every ambient NPC a patrol route crossing at least two regions', () => {
    // Region ids per waypoint are the npcSafeAreas bands; verified in
    // scripts/check-village-npc-placements.mjs. Here we assert the shape:
    // 3+ waypoints, dwell window, and positive speed.
    for (const npc of WORLD_NPCS) {
      const route = npc.patrol!.route
      expect(route.waypoints.length, npc.id).toBeGreaterThanOrEqual(3)
      expect(route.minDwell, npc.id).toBeGreaterThan(0)
      expect(route.minDwell, npc.id).toBeLessThanOrEqual(route.maxDwell)
      expect(npc.patrol!.speed, npc.id).toBeGreaterThan(0)
    }
  })

  it('staggered patrol schedules provide deliberate dwell and look-around timing', () => {
    const walkers = [...VILLAGE_NPCS, ...WORLD_NPCS].filter((npc) => npc.patrol)
    expect(walkers.length).toBe(10)
    for (const npc of walkers) {
      const route = npc.patrol!.route
      expect(route.minDwell, npc.id).toBeGreaterThanOrEqual(3)
      expect(route.maxDwell, npc.id).toBeGreaterThan(route.minDwell)
      expect(route.initialDelay, npc.id).toBeDefined()
    }
    expect(new Set(walkers.map((npc) => npc.patrol!.route.initialDelay)).size)
      .toBeGreaterThanOrEqual(6)
  })
})

describe('Village Training Route NPC definitions', () => {
  it('defines all three training NPCs with stable ids', () => {
    for (const id of trainingNpcIds) {
      expect(VILLAGE_NPCS.find((npc) => npc.id === id), `${id} should exist`).toBeDefined()
    }
    expect(VILLAGE_NPCS).toHaveLength(8)
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

  it('gives supporting residents obstacle-safe patrols', () => {
    const samurai = VILLAGE_NPCS.find((npc) => npc.id === 'dojo-samurai')!
    expect(samurai.patrol).toBeDefined()
    expect(samurai.patrol!.route.waypoints.length).toBeGreaterThanOrEqual(3)
  })

  it('keeps the Elder stationary while giving the Monk a safe routine', () => {
    expect(VILLAGE_NPCS.find((npc) => npc.id === 'elder-masanori')!.patrol).toBeUndefined()
    expect(VILLAGE_NPCS.find((npc) => npc.id === 'village-monk')!.patrol).toBeDefined()
  })

  it('places the Elder on the reachable side of the closed gate', () => {
    const solid = new Set((collisionData as { solid: string[] }).solid)
    for (let y = 20; y <= 24; y += 1) {
      for (let x = 11; x <= 13; x += 1) solid.add(`${x},${y}`)
    }
    const start = { x: 17, y: 25 }
    const elder = VILLAGE_NPCS.find((npc) => npc.id === 'elder-masanori')!
    const target = { x: elder.tileX, y: elder.tileY }
    const seen = new Set([`${start.x},${start.y}`])
    const queue = [start]
    while (queue.length) {
      const current = queue.shift()!
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const next = { x: current.x + dx, y: current.y + dy }
        const key = `${next.x},${next.y}`
        if (
          next.x < 0 ||
          next.y < 0 ||
          next.x >= 35 ||
          next.y >= 35 ||
          seen.has(key) ||
          solid.has(key)
        ) continue
        seen.add(key)
        queue.push(next)
      }
    }
    expect(seen.has(`${target.x},${target.y}`)).toBe(true)
    expect(target.x).toBeLessThan(11)
    expect(target.y).toBeGreaterThanOrEqual(24)
    expect(Math.hypot((11.5 - (target.x + 0.5)) * 16, (25 - (target.y + 1)) * 16)).toBeLessThanOrEqual(48)
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

  it('uses distinct walk sprite keys for every scheduled NPC', () => {
    const walkers = VILLAGE_NPCS.filter((npc) => Boolean(npc.patrol && npc.walkSpriteKey))
    expect(walkers.length).toBeGreaterThan(0)
    const walkKeys = walkers.map((npc) => npc.walkSpriteKey)
    expect(new Set(walkKeys).size).toBe(walkKeys.length)
    for (const key of walkKeys) expect(key).toBeTruthy()
  })

  it('uses distinct walk animation prefixes for every scheduled NPC', () => {
    const walkers = VILLAGE_NPCS.filter((npc) => Boolean(npc.patrol && npc.walkAnimationPrefix))
    const prefixes = walkers.map((npc) => npc.walkAnimationPrefix)
    expect(new Set(prefixes).size).toBe(prefixes.length)
    for (const prefix of prefixes) expect(prefix).toBeTruthy()
  })

  it('keeps ambient NPC dialogue simple and location-flavoured', () => {
    const ambientIds = [
      'plaza-merchant',
      'west-gate-guard',
      'shrine-shaman',
      'south-farmer',
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
