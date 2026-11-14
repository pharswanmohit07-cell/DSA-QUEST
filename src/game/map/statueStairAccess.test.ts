import { describe, expect, it } from 'vitest'
import collisionData from './collisionData.json'
import { VILLAGE_FORCE_SOLID_CELLS } from './villageRegionRules'
import mapJson from '../../assets/tiles/ninja-village/MAP.json'

const WIDTH = mapJson.width as number
const HEIGHT = mapJson.height as number
const layers = mapJson.layers as Array<{ name: string; data?: number[] }>
const obstacles = layers.find((layer) => layer.name === '1_Obstacles')!.data!
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

  it('keeps the central gate threshold usable after the gate is unlocked', () => {
    expect(reachable(false).has('11,20')).toBe(true)
  })
})
