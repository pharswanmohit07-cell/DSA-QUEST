import { describe, expect, it } from 'vitest'
import {
  createSeededRandom,
  oppositeDirection,
  pickOpenDirection,
  RoamAi,
  CARDINALS,
  DIRECTION_VECTORS,
  type CardinalDirection,
} from './roamAi'
import type { Npc } from './Npc'
import type { WanderConfig } from './WanderAi'

/** Fake sprite-only NPC: RoamAi only touches sprite.x/sprite.y. */
function fakeNpc(x = 100, y = 100): Npc {
  return { sprite: { x, y } } as unknown as Npc
}

/** Grid helper: canStandAt that treats every tile open except listed ones. */
function grid(solidTiles: ReadonlySet<string>, tileSize = 16) {
  return (px: number, py: number) => {
    const tx = Math.floor(px / tileSize)
    const ty = Math.floor(py / tileSize)
    return !solidTiles.has(`${tx},${ty}`)
  }
}

describe('roamAi direction helpers', () => {
  it('returns the true opposite heading for every cardinal', () => {
    expect(oppositeDirection('down')).toBe('up')
    expect(oppositeDirection('up')).toBe('down')
    expect(oppositeDirection('left')).toBe('right')
    expect(oppositeDirection('right')).toBe('left')
  })

  it('picks only from headings whose neighbouring tile is open', () => {
    // Probe tile (0,1): its centre is (8, 32). `pickOpenDirection` probes
    // centre + direction, i.e. down=(8,48)→tile(0,3)... in practice: down
    // probe lands in tile (0,2), up in (0,1) itself, left in (-1,2), right in
    // (1,2). Only tile (1,2) is solid here, so only 'right' is excluded — the
    // picker must never return a heading whose probe tile is solid.
    const canStandAt = grid(new Set(['1,2']))
    const seeded = createSeededRandom(42)
    for (let i = 0; i < 50; i++) {
      expect(pickOpenDirection(0, 1, canStandAt, seeded)).not.toBe('right')
    }
  })

  it('excludes every blocked heading from the candidate set', () => {
    // Probe tile (4,4). pickOpenDirection probes centre+direction: down lands
    // at y=(4+2)*16=96 → tile (4,6); up lands at y=(4+0)*16=64 → tile (4,4);
    // left/right land at tiles (3,4) and (5,4). Block exactly the down and up
    // probe tiles so only left/right may be chosen.
    const blocked = new Set(['4,6', '4,4'])
    const canStandAt = grid(blocked)
    const seeded = createSeededRandom(3)
    const picks = new Set<CardinalDirection>()
    for (let i = 0; i < 100; i++) picks.add(pickOpenDirection(4, 4, canStandAt, seeded))
    expect(picks.has('down')).toBe(false)
    expect(picks.has('up')).toBe(false)
  })

  it('falls back to the given heading inside a fully sealed pocket', () => {
    // Every probe tile is solid → the fallback heading is returned.
    const canStandAt = () => false
    expect(pickOpenDirection(0, 1, canStandAt, Math.random, 'up')).toBe('up')
  })

  it('produces a reproducible sequence for a fixed seed', () => {
    const a = createSeededRandom(7)
    const b = createSeededRandom(7)
    for (let i = 0; i < 20; i++) expect(a()).toBe(b())
  })

  it('never produces a value outside [0, 1)', () => {
    const seeded = createSeededRandom(3)
    for (let i = 0; i < 500; i++) {
      const value = seeded()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe('RoamAi movement', () => {
  const config: WanderConfig = {
    speed: 32,
    minDuration: 1,
    maxDuration: 1,
    minPause: 1,
    maxPause: 1,
    leashRadius: 64,
  }

  function makeRoam(
    canStandAt: (x: number, y: number) => boolean,
    seed = 99,
    overrides: Partial<WanderConfig> = {},
  ) {
    const facings: CardinalDirection[] = []
    return {
      facings,
      ai: new RoamAi({ ...config, ...overrides }, {
        canStandAt,
        applyFacing: (direction) => facings.push(direction),
        random: createSeededRandom(seed),
      }),
    }
  }

  it('moves an NPC along an open corridor over many ticks', () => {
    // Fully open grid.
    const roam = makeRoam(grid(new Set()))
    const ai = roam.ai
    const npc = fakeNpc(80, 80)
    // Start: first update begins a pause phase of ~1s.
    ai.update(npc, 16, 0, false)
    let now = 0
    const startX = npc.sprite.x
    const startY = npc.sprite.y
    for (let i = 0; i < 600; i++) {
      now += 16
      ai.update(npc, 16, now, false)
    }
    // A seeded roam on an open grid with a 64px leash must have left home.
    expect(Math.hypot(npc.sprite.x - startX, npc.sprite.y - startY)).toBeGreaterThan(0)
  })

  it('never exceeds its leash radius from home', () => {
    const { ai } = makeRoam(grid(new Set()), 5, { leashRadius: 48 })
    const npc = fakeNpc(160, 160)
    ai.update(npc, 16, 0, false)
    let now = 0
    for (let i = 0; i < 2000; i++) {
      now += 16
      ai.update(npc, 16, now, false)
      const distance = Math.hypot(npc.sprite.x - 160, npc.sprite.y - 160)
      expect(distance).toBeLessThanOrEqual(48 + 2) // small float slack
    }
  })

  it('never walks into a solid tile', () => {
    // Wall of solid tiles across x=12; NPC walks near it endlessly.
    const solid = new Set<string>()
    for (let y = 0; y < 40; y++) solid.add(`12,${y}`)
    const { ai } = makeRoam(grid(solid), 11)
    const npc = fakeNpc(160, 320)
    ai.update(npc, 16, 0, false)
    let now = 0
    for (let i = 0; i < 3000; i++) {
      now += 16
      ai.update(npc, 16, now, false)
      const tx = Math.floor(npc.sprite.x / 16)
      expect(solid.has(`${tx},${Math.floor(npc.sprite.y / 16)}`)).toBe(false)
    }
  })

  it('stays suspended while paused and does not move', () => {
    const { ai } = makeRoam(grid(new Set()))
    const npc = fakeNpc(64, 64)
    ai.update(npc, 16, 0, true)
    const before = { x: npc.sprite.x, y: npc.sprite.y }
    ai.update(npc, 16, 1000, true)
    expect(npc.sprite.x).toBe(before.x)
    expect(npc.sprite.y).toBe(before.y)
  })

  it('uses only cardinal headings when facing', () => {
    const { ai, facings } = makeRoam(grid(new Set()), 21)
    const npc = fakeNpc(96, 96)
    ai.update(npc, 16, 0, false)
    let now = 0
    for (let i = 0; i < 400; i++) {
      now += 16
      ai.update(npc, 16, now, false)
    }
    for (const facing of facings) expect(CARDINALS).toContain(facing)
  })

  it('applies one unit vector per heading', () => {
    expect(DIRECTION_VECTORS.down).toEqual({ x: 0, y: 1 })
    expect(DIRECTION_VECTORS.up).toEqual({ x: 0, y: -1 })
    expect(DIRECTION_VECTORS.left).toEqual({ x: -1, y: 0 })
    expect(DIRECTION_VECTORS.right).toEqual({ x: 1, y: 0 })
  })
})
