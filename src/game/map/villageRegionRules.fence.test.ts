import { describe, expect, it } from 'vitest'

import {
  VILLAGE_FENCE_OVERLAY_CELLS,
  VILLAGE_FORCE_SOLID_CELLS,
} from './villageRegionRules'
import { WALKABLE_TILE_IDS } from './walkableTileIds'
import { ABOVE_PLAYER_TILE_IDS } from './abovePlayerTileIds'
import mapJson from '../../assets/tiles/ninja-village/MAP.json'

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, index) => from + index)

const WIDTH = mapJson.width as number
const layers = mapJson.layers as Array<{ name: string; data?: number[] }>
const obstacles = layers.find((layer) => layer.name === '1_Obstacles')!.data!

/**
 * The fence-overlay set is the *foreground copy* of the fence tiles. Every
 * cell it lists must actually be solid in the obstacle layer (or force-solid),
 * otherwise the game would paint a foreground fence over walkable ground and
 * visually trap the player.
 */
describe('village fence overlay cells', () => {
  it('marks every fence-overlay cell solid in the obstacle layer', () => {
    const violations: string[] = []
    for (const cell of VILLAGE_FENCE_OVERLAY_CELLS) {
      const [x, y] = cell.split(',').map(Number)
      const gid = obstacles[y * WIDTH + x] ?? 0
      if (gid !== 0 && !WALKABLE_TILE_IDS.has(gid)) continue
      if (VILLAGE_FORCE_SOLID_CELLS.has(cell)) continue
      violations.push(cell)
    }
    expect(violations, `non-solid fence cells: ${violations.join(', ')}`).toEqual([])
  })

  it('keeps the compound gate cells open', () => {
    expect(VILLAGE_FENCE_OVERLAY_CELLS.has('16,18')).toBe(false)
    expect(VILLAGE_FENCE_OVERLAY_CELLS.has('21,18')).toBe(false)
  })

  it('covers the full north field fence row reported in the bug report', () => {
    for (let x = 26; x <= 34; x += 1) {
      expect(VILLAGE_FENCE_OVERLAY_CELLS.has(`${x},0`), `cell ${x},0`).toBe(true)
      expect(VILLAGE_FENCE_OVERLAY_CELLS.has(`${x},2`), `cell ${x},2`).toBe(true)
    }
  })

  it('covers the west boundary fence and the sand-road divider', () => {
    for (let x = 0; x <= 9; x += 1) {
      expect(VILLAGE_FENCE_OVERLAY_CELLS.has(`${x},14`), `cell ${x},14`).toBe(true)
    }
    // The sand-road divider fence-top rail sits on row 19 (row 18 is ground).
    for (let x = 3; x <= 5; x += 1) {
      expect(VILLAGE_FENCE_OVERLAY_CELLS.has(`${x},19`), `cell ${x},19`).toBe(true)
    }
  })

  it('paints fence-top GIDs on the above-player layer (foreground fix)', () => {
    // The timber fence rails (FENCE_TOP_GIDS in abovePlayerTileIds) must be
    // drawn over the player. Every fence-overlay cell whose obstacle GID is a
    // fence rail must therefore be covered by ABOVE_PLAYER_TILE_IDS.
    const FENCE_TOP_GIDS = [
      ...range(1242, 1244),
      ...range(1265, 1267),
      ...range(1275, 1277),
      ...range(1465, 1467),
    ]
    const seen = new Set<number>()
    for (const cell of VILLAGE_FENCE_OVERLAY_CELLS) {
      const [x, y] = cell.split(',').map(Number)
      const gid = obstacles[y * WIDTH + x]
      if (gid && FENCE_TOP_GIDS.includes(gid)) seen.add(gid)
    }
    expect(seen.size).toBeGreaterThan(0)
    for (const gid of seen) {
      expect(
        ABOVE_PLAYER_TILE_IDS.has(gid),
        `fence rail GID ${gid} must be in ABOVE_PLAYER_TILE_IDS`,
      ).toBe(true)
    }
  })
})
