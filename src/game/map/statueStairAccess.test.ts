import { describe, expect, it } from 'vitest'
import collisionData from './collisionData.json'
import { VILLAGE_FENCE_OVERLAY_CELLS, VILLAGE_FORCE_SOLID_CELLS } from './villageRegionRules'
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

  const start = '4,20'
  const reachable = new Set([start])
  const queue = [start]

  for (let head = 0; head < queue.length; head += 1) {
    const [x, y] = queue[head]!.split(',').map(Number)
    for (const [nextX, nextY] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ]) {
      if (nextX < 0 || nextY < 0 || nextX >= WIDTH || nextY >= HEIGHT) continue
      const next = `${nextX},${nextY}`
      if (blocked.has(next) || reachable.has(next)) continue
      reachable.add(next)
      queue.push(next)
    }
  }

  return reachable
}

describe('stair-side access beside the statue pillars', () => {
  it('does not let the lower path bypass the locked main gate and reach the north side', () => {
    const reachableCells = reachable(true)

    expect(VILLAGE_FORCE_SOLID_CELLS.has('10,20')).toBe(true)
    expect(collision.has('10,20'), 'the side pillar beside the stair must be solid').toBe(true)
    expect(
      [...reachableCells].some((cell) => Number(cell.split(',')[1]) <= 13),
      'the north side of the statue pillars must stay unreachable while the main gate is locked',
    ).toBe(false)
  })

  it('allows walking behind both pillars but blocks the front bases and frog side rails', () => {
    for (const cell of ['10,20', '14,20', '10,21', '14,21']) {
      expect(collision.has(cell), `upper overhang ${cell} must be walk-behind`).toBe(false)
      expect(VILLAGE_FORCE_SOLID_CELLS.has(cell)).toBe(false)
      expect(VILLAGE_FENCE_OVERLAY_CELLS.has(cell)).toBe(false)
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

  it('keeps both stair rails and the inner statue edges solid and drawn in front', () => {
    expect(VILLAGE_FORCE_SOLID_CELLS.has('14,20')).toBe(true)
    for (const cell of ['10,20', '14,20', '10,21', '14,21']) {
      expect(collision.has(cell), `stair-side cell ${cell} must block the player`).toBe(true)
    }
    for (const cell of ['10,21', '14,21']) {
      expect(VILLAGE_FENCE_OVERLAY_CELLS.has(cell), `stair-side cell ${cell} must draw over the player`).toBe(true)
    }
  })

  it('keeps the central gate threshold usable after the gate is unlocked', () => {
    expect(reachable(false).has('11,20')).toBe(true)
  })
})
