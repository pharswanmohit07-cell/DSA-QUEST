import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

type Point = { x: number; y: number }
type Direction = 'front' | 'back' | 'left' | 'right'

const expected = JSON.parse(
  fs.readFileSync(path.resolve('tests/village-expected-behavior.json'), 'utf8'),
) as {
  categories: Record<string, Array<{
    name: string
    base: Point
    upper?: Point
    expected: Record<string, 'blocked' | 'passable'>
  }>>
  routes: Record<string, Point & { assumeGateUnlocked?: boolean; standAdjacentTo?: Point }>
  lowerHalfHash: { expectedObstacleAndVisualFNV1a: string }
}

const map = JSON.parse(
  fs.readFileSync(path.resolve('src/assets/tiles/ninja-village/MAP.json'), 'utf8'),
) as {
  width: number
  height: number
  layers: Array<{ name: string; data?: number[] }>
}

const walkableSource = fs.readFileSync(
  path.resolve('src/game/map/walkableTileIds.ts'),
  'utf8',
)
const overhangSource = fs.readFileSync(
  path.resolve('src/game/map/abovePlayerTileIds.ts'),
  'utf8',
)

function parseNamedArray(source: string, name: string): number[] {
  const start = source.indexOf(`const ${name}:`)
  if (start < 0) {
    return []
  }
  const equals = source.indexOf('=', start)
  const open = source.indexOf('[', equals)
  let depth = 0
  let close = -1
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '[') depth += 1
    if (source[index] === ']') {
      depth -= 1
      if (depth === 0) {
        close = index
        break
      }
    }
  }
  if (close < 0) return []

  const values: number[] = []
  for (const match of source.slice(open + 1, close).matchAll(
    /range\(\s*(\d+)\s*,\s*(\d+)\s*\)|(?<![\w.])(\d+)(?![\w.])/g,
  )) {
    if (match[1]) {
      for (let value = Number(match[1]); value <= Number(match[2]); value += 1) {
        values.push(value)
      }
    } else {
      values.push(Number(match[3]))
    }
  }
  return values
}

const walkableIds = new Set(
  [
    'GATE_THRESHOLD_TILE_IDS',
    'WEST_GATE_TILE_IDS',
    'SOUTH_STAIRS_TILE_IDS',
    'DESERT_CAVE_ARCHWAY_TILE_IDS',
    'SOUTH_DOORWAY_TILE_IDS',
    'DESERT_PEBBLE_TRACK_TILE_IDS',
    'SNOW_GROUND_TILE_IDS',
  ].flatMap((name) => parseNamedArray(walkableSource, name)),
)

const nonSolidIds = new Set(
  [
    'ROOF_TOP_GIDS',
    'CANOPY_TOP_GIDS',
    'BOULDER_TOP_GIDS',
    'STONE_STRUCTURE_TOP_GIDS',
    'VILLAGE_PILLAR_TOP_GIDS',
    'VILLAGE_HOUSE_UPPER_GIDS',
    'VILLAGE_TREE_UPPER_GIDS',
    'SNOW_PILLAR_TOP_GIDS',
    'FROG_STATUE_MIDDLE_GIDS',
  ].flatMap((name) => parseNamedArray(overhangSource, name)),
)

const ground = map.layers.find((layer) => layer.name === '0_Ground')!.data!
const obstacles = map.layers.find((layer) => layer.name === '1_Obstacles')!.data!
const roleTable = JSON.parse(
  fs.readFileSync(path.resolve('tests/village-gid-roles.json'), 'utf8'),
) as {
  gids: Array<{ gid: number; role: 'BASE' | 'UPPER_ART' | 'PASSABLE_SURFACE' }>
}

const roleByGid = new Map(roleTable.gids.map((row) => [row.gid, row.role]))
const gateCells = new Set(
  Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 3 }, (_, column) => `${11 + column},${20 + row}`),
  ).flat(),
)

function fnv1a(value: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

function currentPassable(x: number, y: number, gateUnlocked = true): boolean {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return false

  const position = `${x},${y}`
  const groundGid = ground[y * map.width + x]
  const obstacleGid = obstacles[y * map.width + x]

  if (groundGid === 68 || groundGid === 124) return false
  if ([1542, 1543, 1544, 1575, 1576, 1577].includes(groundGid)) return false

  if (gateCells.has(position)) return gateUnlocked

  if (obstacleGid <= 0) return true

  if (y < 25) {
    const role = roleByGid.get(obstacleGid)
    if (role === 'UPPER_ART' || role === 'PASSABLE_SURFACE') return true
  }

  return walkableIds.has(obstacleGid) || nonSolidIds.has(obstacleGid) || position === '18,15'
}

function bfs(start: Point, target: Point, gateUnlocked: boolean): boolean {
  const queue: Point[] = [start]
  const seen = new Set([`${start.x},${start.y}`])

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]
    if (current.x === target.x && current.y === target.y) return true

    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = { x: current.x + dx, y: current.y + dy }
      const key = `${next.x},${next.y}`
      if (!seen.has(key) && currentPassable(next.x, next.y, gateUnlocked)) {
        seen.add(key)
        queue.push(next)
      }
    }
  }

  return false
}

async function startGame(page: Page) {
  await page.goto('/?debug=1')
  await page.getByRole('button', { name: /^PLAY$/i }).click()
  await page.waitForSelector('#game-container canvas')
  await page.waitForFunction(() => Boolean((globalThis as { __dsaVillagePhysicsProbe?: unknown }).__dsaVillagePhysicsProbe))
}

async function probeTile(page: Page, point: Point) {
  return page.evaluate((p) => {
    const probe = (globalThis as {
      __dsaVillagePhysicsProbe?: {
        getTile: (x: number, y: number) => { gid: number; collides: boolean; abovePlayer: boolean }
      }
    }).__dsaVillagePhysicsProbe
    if (!probe) throw new Error('Physics probe is unavailable')
    return probe.getTile(p.x, p.y)
  }, point)
}

async function setPlayerTile(page: Page, point: Point) {
  await page.evaluate((p) => {
    const probe = (globalThis as {
      __dsaVillagePhysicsProbe?: { setPlayerTile: (x: number, y: number) => void }
    }).__dsaVillagePhysicsProbe
    if (!probe) throw new Error('Physics probe is unavailable')
    probe.setPlayerTile(p.x, p.y)
  }, point)
}

async function getPlayerTile(page: Page): Promise<Point> {
  return page.evaluate(() => {
    const probe = (globalThis as {
      __dsaVillagePhysicsProbe?: { getPlayerTile: () => Point }
    }).__dsaVillagePhysicsProbe
    if (!probe) throw new Error('Physics probe is unavailable')
    return probe.getPlayerTile()
  })
}

const keys: Record<Direction, string> = {
  front: 'ArrowUp',
  back: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
}

const startsForDirection = (base: Point, direction: Direction): Point => {
  switch (direction) {
    case 'front': return { x: base.x, y: base.y + 1 }
    case 'back': return { x: base.x, y: base.y - 1 }
    case 'left': return { x: base.x - 1, y: base.y }
    case 'right': return { x: base.x + 1, y: base.y }
  }
}

test.describe.serial('village physics regression', () => {
  test('prints the complete village GID role table', () => {
    console.table(roleTable.gids)
    expect(roleTable.gids).toHaveLength(437)
  })

  test('probes every expected object example from all four sides', async ({ page }) => {
    await startGame(page)

    const rows: Array<Record<string, string>> = []

    for (const [category, examples] of Object.entries(expected.categories)) {
      for (const example of examples) {
        const baseState = await probeTile(page, example.base)
        rows.push({
          category,
          object: example.name,
          tile: `${example.base.x},${example.base.y}`,
          role: baseState.collides ? 'BASE' : 'NOT_SOLID',
          gid: String(baseState.gid),
        })

        const failures: string[] = []
        for (const direction of Object.keys(example.expected) as Array<keyof typeof example.expected>) {
          if (direction === 'upper') continue

          const start = startsForDirection(example.base, direction as Direction)
          await setPlayerTile(page, start)
          const before = await getPlayerTile(page)
          await page.keyboard.down(keys[direction as Direction])
          await page.waitForTimeout(350)
          await page.keyboard.up(keys[direction as Direction])
          const after = await getPlayerTile(page)

          const expectedOutcome = example.expected[direction]
          const reachedBase = after.x === example.base.x && after.y === example.base.y
          const pass = expectedOutcome === 'blocked' ? !reachedBase : reachedBase
          if (!pass) {
            failures.push(`${direction}: expected ${expectedOutcome}, start ${before.x},${before.y}, end ${after.x},${after.y}`)
          }
        }

        if (example.upper) {
          await setPlayerTile(page, { x: example.upper.x, y: example.upper.y - 1 })
          await page.keyboard.down('ArrowDown')
          await page.waitForTimeout(350)
          await page.keyboard.up('ArrowDown')
          const after = await getPlayerTile(page)
          if (after.x !== example.upper.x || after.y < example.upper.y) {
            failures.push(`upper: expected passable, landed ${after.x},${after.y}`)
          }
          const upperState = await probeTile(page, example.upper)
          if (!upperState.abovePlayer || upperState.collides) {
            failures.push(`upper tile state invalid: gid=${upperState.gid}, collides=${upperState.collides}, abovePlayer=${upperState.abovePlayer}`)
          }
        }

        rows.push({
          category,
          object: `${example.name} result`,
          tile: `${example.base.x},${example.base.y}`,
          role: failures.length === 0 ? 'PASS' : 'FAIL',
          gid: failures.join(' | ') || 'all expected probes passed',
        })
      }
    }

    console.table(rows)
    const failed = rows.filter((row) => row.role === 'FAIL')
    expect(failed, 'Every expected behavior row must pass').toEqual([])
  })

  test('route test reaches every required village point with the gate opened', async () => {
    const results = Object.entries(expected.routes)
      .filter(([name]) => name !== 'spawn')
      .map(([name, target]) => ({
        name,
        reachable: bfs(expected.routes.spawn, target, target.assumeGateUnlocked !== false),
      }))

    console.table(results)
    expect(results.filter((row) => !row.reachable)).toEqual([])
  })

  test('lower-half collision/depth data retains the baseline hash', async () => {
    const lowerRows = {
      ground: ground.slice(25 * map.width),
      obstacles: obstacles.slice(25 * map.width),
      abovePlayer: (map.layers.find((layer) => layer.name === '2_AbovePlayer')!.data ?? []).slice(25 * map.width),
      walkableIds: [...walkableIds].sort((a, b) => a - b),
      lowerRelevantNonSolidIds: [...nonSolidIds].filter((gid) =>
        obstacles.slice(25 * map.width).includes(gid),
      ).sort((a, b) => a - b),
      playerBody: '10x8@3,7',
      depth: 'ground=0,obstacles=10,abovePlayer=1000,character=100+body.bottom',
    }

    const visualHash = fnv1a(JSON.stringify({
      ground: lowerRows.ground,
      obstacles: lowerRows.obstacles,
      abovePlayer: lowerRows.abovePlayer,
    }))
    const collisionDepthHash = fnv1a(JSON.stringify({
      ground: lowerRows.ground,
      obstacles: lowerRows.obstacles,
      abovePlayer: lowerRows.abovePlayer,
      relevantWalk: lowerRows.walkableIds,
      relevantNonSolid: lowerRows.lowerRelevantNonSolidIds,
      playerBody: lowerRows.playerBody,
      depth: lowerRows.depth,
    }))
    console.table([
      {
        check: 'lower-half visual layers',
        expected: expected.lowerHalfHash.expectedObstacleAndVisualFNV1a,
        actual: visualHash,
        pass: visualHash === expected.lowerHalfHash.expectedObstacleAndVisualFNV1a,
      },
      {
        check: 'lower-half collision/depth',
        expected: expected.lowerHalfHash.expectedCollisionDepthFNV1a,
        actual: collisionDepthHash,
        pass: collisionDepthHash === expected.lowerHalfHash.expectedCollisionDepthFNV1a,
      },
    ])
    expect(visualHash).toBe(expected.lowerHalfHash.expectedObstacleAndVisualFNV1a)
    expect(collisionDepthHash).toBe(expected.lowerHalfHash.expectedCollisionDepthFNV1a)
  })

  test('captures debug screenshots with ?debug=1', async ({ page }) => {
    await startGame(page)

    await page.screenshot({
      path: path.resolve('test-results/village-debug.png'),
      fullPage: true,
    })

    await page.evaluate(() => {
      const probe = (globalThis as {
        __dsaVillagePhysicsProbe?: { setPlayerTile: (x: number, y: number) => void }
      }).__dsaVillagePhysicsProbe
      probe?.setPlayerTile(18, 18)
    })

    await page.waitForTimeout(200)
    await page.screenshot({
      path: path.resolve('test-results/lower-half-debug.png'),
      fullPage: true,
    })
  })
})
