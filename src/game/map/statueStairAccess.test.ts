import { describe, expect, it } from 'vitest'
import collisionData from './collisionData.json'
import {
  VILLAGE_FENCE_OVERLAY_CELLS,
  VILLAGE_FORCE_SOLID_CELLS,
  VILLAGE_PILLAR_OVERHANG_CELLS,
  VILLAGE_PILLAR_ONE_WAY_FRONT_CELLS,
  VILLAGE_PILLAR_ONE_WAY_COLLISION_FACES,
} from './villageRegionRules'
import mapJson from '../../assets/tiles/ninja-village/MAP.json'

const WIDTH = mapJson.width as number
const HEIGHT = mapJson.height as number
const layers = mapJson.layers as Array<{ name: string; data?: number[] }>
const obstacles = layers.find((layer) => layer.name === '1_Obstacles')!.data!
const ground = layers.find((layer) => layer.name === '0_Ground')!.data!
const collision = new Set((collisionData as { solid: string[] }).solid)

function reachable(gateLocked: boolean): Set<string> {
  const blocked = new Set(collision)

  // Mirror MainScene's locked-gate collision: the three threshold columns
  // stay closed until the player completes the gate challenge.
  if (gateLocked) {
    for (let y = 20; y <= 24; y += 1) {
      for (let x = 11; x <= 13; x += 1) {
        if (obstacles[y * WIDTH + x] !== 0) blocked.add(`${x},${y}`)
      }
    }
  }

  const face = VILLAGE_PILLAR_ONE_WAY_COLLISION_FACES
  const isOneWayCell = (x: number, y: number) =>
    VILLAGE_PILLAR_ONE_WAY_FRONT_CELLS.has(`${x},${y}`)
  const edgeBlocksMove = (x: number, y: number, nextX: number, nextY: number) => {
    const dx = nextX - x
    const dy = nextY - y
    const exitFace = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up'
    const entryFace = dx > 0 ? 'left' : dx < 0 ? 'right' : dy > 0 ? 'up' : 'down'
    return (
      isOneWayCell(x, y) && face[exitFace] ||
      isOneWayCell(nextX, nextY) && face[entryFace]
    )
  }

  const start = '4,20'
  const reachable = new Set([start])
  const queue: Array<[number, number]> = [[4, 20]]

  for (let head = 0; head < queue.length; head += 1) {
    const [x, y] = queue[head]!
    for (const [nextX, nextY] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ]) {
      if (nextX < 0 || nextY < 0 || nextX >= WIDTH || nextY >= HEIGHT) continue
      const next = `${nextX},${nextY}`
      if (blocked.has(next) || reachable.has(next) || edgeBlocksMove(x, y, nextX, nextY)) continue
      reachable.add(next)
      queue.push([nextX, nextY])
    }
  }

  return reachable
}

describe('stair-side access beside the statue pillars', () => {
  it('does not let the lower path bypass the locked main gate and reach the north side', () => {
    const reachableCells = reachable(true)

    expect(VILLAGE_PILLAR_OVERHANG_CELLS.has('10,20')).toBe(true)
    expect(VILLAGE_PILLAR_ONE_WAY_FRONT_CELLS.has('10,20')).toBe(true)
    expect(collision.has('10,20'), 'the upper stair pillar remains traversable for NPC route planning').toBe(false)
    expect(
      [...reachableCells].some((cell) => Number(cell.split(',')[1]) <= 13),
      'the north side of the statue pillars must stay unreachable while the main gate is locked',
    ).toBe(false)
  })

  it('allows walking behind both pillars but blocks the front bases and frog side rails', () => {
    expect(VILLAGE_PILLAR_ONE_WAY_COLLISION_FACES).toEqual({
      left: true,
      right: true,
      up: false,
      down: true,
    })
    for (const cell of ['10,20', '14,20']) {
      expect(VILLAGE_PILLAR_OVERHANG_CELLS.has(cell)).toBe(true)
      expect(VILLAGE_PILLAR_ONE_WAY_FRONT_CELLS.has(cell)).toBe(true)
      expect(VILLAGE_FORCE_SOLID_CELLS.has(cell)).toBe(false)
      expect(VILLAGE_FENCE_OVERLAY_CELLS.has(cell)).toBe(false)
      expect(collision.has(cell)).toBe(false)
    }
    for (const cell of ['10,21', '14,21']) {
      expect(VILLAGE_PILLAR_OVERHANG_CELLS.has(cell)).toBe(true)
      expect(VILLAGE_PILLAR_ONE_WAY_FRONT_CELLS.has(cell)).toBe(true)
      expect(VILLAGE_FORCE_SOLID_CELLS.has(cell)).toBe(false)
      expect(VILLAGE_FENCE_OVERLAY_CELLS.has(cell)).toBe(false)
      expect(collision.has(cell)).toBe(true)
    }

    for (const cell of ['9,22', '10,22', '14,22', '15,22']) {
      expect(collision.has(cell), `front/base cell ${cell} must block entry`).toBe(true)
      expect(VILLAGE_FENCE_OVERLAY_CELLS.has(cell)).toBe(true)
    }
  })

  it('backs the left stair pillar with the same timber tile as the right pillar', () => {
    const leftBacking = ground[21 * WIDTH + 10]
    const rightBacking = ground[21 * WIDTH + 14]

    expect(leftBacking).toBe(1542)
    expect(leftBacking).toBe(rightBacking)
  })

  it('keeps the central gate threshold usable after the gate is unlocked', () => {
    expect(reachable(false).has('11,20')).toBe(true)
  })
})
