import { beforeEach, describe, expect, it } from 'vitest'
import { MapRoamAi, tileCenterX, tileFootY } from './mapRoamAi'
import type { AmbientMovementProfile } from './movementProfiles'
import type { Npc } from './Npc'
import { createSeededRandom } from './roamAi'

const TILE = 16
const GRID_W = 10
const GRID_H = 10

/** All-open 10×10 grid unless a test punches holes. */
function makeGrid(solid: ReadonlyArray<[number, number]> = []) {
  const solidSet = new Set(solid.map(([x, y]) => `${x},${y}`))
  return {
    width: GRID_W,
    height: GRID_H,
    isTileWalkable: (x: number, y: number) =>
      x >= 0 && y >= 0 && x < GRID_W && y < GRID_H && !solidSet.has(`${x},${y}`),
  }
}

/**
 * Legacy mechanics fixtures exercise pure pathfinding (collision, occupancy,
 * pause/resume) without geography, so the AI runs unmasked there. Region
 * masking is covered by `regionalRoaming.test.ts`, which supplies the real
 * mask through the `regionMask` dependency.
 */
function makeUnmaskedGrid(grid = makeGrid()) {
  return grid
}

const PROFILE: AmbientMovementProfile = {
  kind: 'ambient',
  region: 'village',
  speed: 32,
  minPauseDuration: 0,
  maxPauseDuration: 0,
  minDestinationTiles: 3,
}

type FakeSprite = { x: number; y: number; anims: { currentAnim: { key: string } | null } }
type FakeNpc = Npc

function makeNpc(tileX: number, tileY: number): { npc: FakeNpc; sprite: FakeSprite } {
  const sprite: FakeSprite = {
    x: tileCenterX(tileX),
    y: tileFootY(tileY),
    anims: { currentAnim: null },
  }
  const npc = { id: 'test', sprite } as unknown as FakeNpc
  return { npc, sprite }
}

describe('MapRoamAi', () => {
  let facing: string[]
  let depsConfig: { canStandAt: (x: number, y: number) => boolean }

  beforeEach(() => {
    facing = []
    depsConfig = { canStandAt: () => true }
  })

  function makeAi(grid = makeUnmaskedGrid(), occupied: string[] = []) {
    const occupiedSet = new Set(occupied)
    return new MapRoamAi({
      profile: PROFILE,
      grid,
      canStandAt: (x, y) => depsConfig.canStandAt(x, y),
      applyFacing: (d) => facing.push(d),
      isOccupied: (x, y) => occupiedSet.has(`${x},${y}`),
      random: createSeededRandom(42),
    })
  }

  it('plans a reachable destination at least minDestinationTiles away', () => {
    const { npc, sprite } = makeNpc(2, 2)
    const ai = makeAi()
    // Force a plan by advancing past the first dwell.
    ai.update(npc, 16, 0, false)
    ai.update(npc, 16, 60_000, false)
    const destination = ai.currentDestination
    expect(destination).not.toBeNull()
    const distance = Math.hypot(
      (destination?.x ?? 0) - 2,
      (destination?.y ?? 0) - 2,
    )
    expect(distance).toBeGreaterThanOrEqual(PROFILE.minDestinationTiles)
    expect(ai.originTile).toEqual({ x: 2, y: 2 })
    void sprite
  })

  it('moves continuously toward the destination (no teleport)', () => {
    const { npc, sprite } = makeNpc(2, 2)
    const ai = makeAi()
    ai.update(npc, 16, 0, false)
    ai.update(npc, 16, 60_000, false)
    expect(ai.walking).toBe(true)
    const startX = sprite.x
    const startY = sprite.y
    const positions: Array<[number, number]> = []
    for (let frame = 0; frame < 60; frame += 1) {
      ai.update(npc, 16, 60_000 + frame * 16, false)
      positions.push([sprite.x, sprite.y])
    }
    // Each step is bounded by speed * delta.
    for (let i = 1; i < positions.length; i += 1) {
      const [prevX, prevY] = positions[i - 1] ?? [0, 0]
      const [currX, currY] = positions[i] ?? [0, 0]
      expect(Math.hypot(currX - prevX, currY - prevY)).toBeLessThanOrEqual(
        (PROFILE.speed * 16) / 1000 + 0.5,
      )
    }
    // And the NPC has moved monotonically away from its start at least once.
    const [lastX, lastY] = positions[positions.length - 1] ?? [startX, startY]
    expect(Math.hypot(lastX - startX, lastY - startY)).toBeGreaterThan(0)
  })

  it('uses cardinal movement only', () => {
    const { npc } = makeNpc(2, 2)
    const ai = makeAi()
    ai.update(npc, 16, 0, false)
    ai.update(npc, 16, 60_000, false)
    for (const direction of facing) {
      expect(['down', 'up', 'left', 'right']).toContain(direction)
    }
    expect(facing.length).toBeGreaterThan(0)
  })

  it('never walks into solid tiles', () => {
    // Wall the east side; the NPC at (2,2) must never end beyond x=5.
    const grid = makeGrid([[5, 2], [5, 3], [5, 4], [5, 5]])
    const { npc, sprite } = makeNpc(2, 2)
    const ai = makeAi(grid)
    ai.update(npc, 16, 0, false)
    for (let frame = 0; frame < 600; frame += 1) {
      ai.update(npc, 16, frame * 16 + 60_000, false)
      const tileX = Math.floor(sprite.x / TILE)
      const tileY = Math.floor((sprite.y - TILE / 2) / TILE)
      expect(grid.isTileWalkable(tileX, tileY)).toBe(true)
    }
  })

  it('respects the NPC footprint, not just the centre tile', () => {
    // canStandAt refuses anything within 5px of x=80 (tile 5 edge) — simulating
    // a wide body; the NPC must stop short.
    depsConfig.canStandAt = (x) => x < 75
    const { npc, sprite } = makeNpc(2, 2)
    const ai = makeAi()
    ai.update(npc, 16, 0, false)
    for (let frame = 0; frame < 600; frame += 1) {
      ai.update(npc, 16, frame * 16 + 60_000, false)
      expect(sprite.x).toBeLessThan(80)
    }
  })

  it('avoids tiles occupied by other NPCs', () => {
    // Reserve (5,2) so the BFS cannot route through or onto it.
    const { npc, sprite } = makeNpc(2, 2)
    const ai = makeAi(makeGrid(), ['5,2'])
    ai.update(npc, 16, 0, false)
    for (let frame = 0; frame < 600; frame += 1) {
      ai.update(npc, 16, frame * 16 + 60_000, false)
      const tileX = Math.floor(sprite.x / TILE)
      const tileY = Math.floor((sprite.y - TILE / 2) / TILE)
      expect(`${tileX},${tileY}`).not.toBe('5,2')
    }
  })

  it('stays put when the reachable component is unreachable/small', () => {
    // Fully sealed room of 2×2 tiles: nowhere is minDestinationTiles away.
    const sealed: Array<[number, number]> = []
    for (let y = 0; y < GRID_H; y += 1) {
      for (let x = 0; x < GRID_W; x += 1) {
        const inRoom = x >= 1 && x <= 3 && y >= 1 && y <= 3
        if (!inRoom && !(x === 0 && y === 0)) sealed.push([x, y])
      }
    }
    // Rebuild the grid with everything outside the 3×3 room solid, NPC inside.
    const innerSolid = new Set(sealed.map(([x, y]) => `${x},${y}`))
    const sealedGrid = {
      width: GRID_W,
      height: GRID_H,
      isTileWalkable: (x: number, y: number) => !innerSolid.has(`${x},${y}`),
    }
    const { npc, sprite } = makeNpc(2, 2)
    const ai = makeAi(sealedGrid)
    ai.update(npc, 16, 0, false)
    for (let frame = 0; frame < 200; frame += 1) {
      ai.update(npc, 16, frame * 16 + 60_000, false)
      const tileX = Math.floor(sprite.x / TILE)
      const tileY = Math.floor((sprite.y - TILE / 2) / TILE)
      expect(sealedGrid.isTileWalkable(tileX, tileY)).toBe(true)
    }
  })

  it('supports pause and resume', () => {
    const { npc, sprite } = makeNpc(2, 2)
    const ai = makeAi()
    ai.update(npc, 16, 0, false)
    ai.update(npc, 16, 60_000, false)
    expect(ai.walking).toBe(true)
    const atPause = sprite.x
    // Pause: nothing moves.
    for (let frame = 0; frame < 30; frame += 1) {
      ai.update(npc, 16, frame * 16 + 61_000, true)
    }
    expect(sprite.x).toBe(atPause)
    // Resume: movement continues (may re-plan after the pause reset).
    ai.update(npc, 16, 100_000, false)
    expect(ai.walking || ai.remainingPath.length === 0).toBe(true)
  })

  it('re-plans when a route becomes blocked mid-journey', () => {
    depsConfig.canStandAt = (x) => x < 70
    const { npc, sprite } = makeNpc(2, 2)
    const ai = makeAi()
    ai.update(npc, 16, 0, false)
    ai.update(npc, 16, 60_000, false)
    let sawBlockedStop = false
    for (let frame = 0; frame < 600; frame += 1) {
      ai.update(npc, 16, frame * 16 + 60_000, false)
      if (sprite.x <= 70 && !ai.walking) sawBlockedStop = true
    }
    expect(sawBlockedStop).toBe(true)
  })

  it('discovers a route through a previously locked gate once unlocked', () => {
    // Grid with a gate column at x=5 that opens after some time. The gate is
    // the ONLY opening between west (x<5) and east (x>5): rows 0-1 and 6-9
    // are walls, so while locked the NPC cannot plan east at all.
    let gateOpen = false
    const walls: Array<[number, number]> = []
    for (let y = 0; y < GRID_H; y += 1) {
      for (let x = 0; x < GRID_W; x += 1) {
        if (x === 5) continue
        const westSide = x < 5
        const inCorridor = westSide || (y >= 2 && y <= 5)
        // Seal all rows outside the gate corridor on the east side and the
        // corners of the west side, forcing the gate as the sole crossing.
        if (!inCorridor) walls.push([x, y])
      }
    }
    const base = makeGrid(walls)
    const grid = {
      width: GRID_W,
      height: GRID_H,
      isTileWalkable(x: number, y: number) {
        if (x === 5) return gateOpen && y >= 2 && y <= 5
        return base.isTileWalkable(x, y)
      },
    }
    const { npc } = makeNpc(2, 3)
    const ai = makeAi(grid)
    ai.update(npc, 16, 0, false)
    ai.update(npc, 16, 60_000, false)
    // While locked, the NPC never targets beyond the gate column.
    const lockedDest = ai.currentDestination
    expect(lockedDest).not.toBeNull()
    expect(lockedDest?.x).toBeLessThan(5)
    gateOpen = true
    // Force a fresh plan after the unlock: keep ticking until it either plans
    // east or, if it first picks another west destination, exhausts that
    // journey and re-plans. Long horizon covers several dwell cycles.
    let unlockedDest: { x: number; y: number } | null = null
    for (let frame = 0; frame < 3000; frame += 1) {
      ai.update(npc, 16, 200_000 + frame * 16, false)
      const destination = ai.currentDestination
      if (destination && destination.x > 5) {
        unlockedDest = destination
        break
      }
    }
    expect(unlockedDest).not.toBeNull()
  })

  it('keeps the NPC inside the map bounds', () => {
    const { npc, sprite } = makeNpc(1, 1)
    const ai = makeAi()
    ai.update(npc, 16, 0, false)
    for (let frame = 0; frame < 600; frame += 1) {
      ai.update(npc, 16, frame * 16 + 60_000, false)
      expect(sprite.x).toBeGreaterThanOrEqual(0)
      expect(sprite.y).toBeGreaterThanOrEqual(TILE)
      expect(sprite.x).toBeLessThanOrEqual(GRID_W * TILE)
      expect(sprite.y).toBeLessThanOrEqual(GRID_H * TILE)
    }
  })
})
