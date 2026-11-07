#!/usr/bin/env node
/**
 * READ-ONLY development report: walkable region inventory for the village map.
 * Mirrors the game's collision derivation and prints region summaries to
 * inform NPC placement planning. Not part of npm scripts; development aid only.
 */
import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const map = require('../src/assets/tiles/ninja-village/MAP.json')

async function importRuleModule(relativeUrl) {
  const src = fs.readFileSync(new URL(relativeUrl, import.meta.url), 'utf8')
  const stripped = src
    .replace(/function expandRect\(x0: number, x1: number, y0: number, y1: number\)/, 'function expandRect(x0, x1, y0, y1)')
    .replace(/: Set<string>|: string\[\]|: ReadonlySet<number>|: number\[\]/g, '')
    .replace(/: ReadonlySet<number>/g, '')
    .replace(/: Set<number>/g, '')
    .replace(/: readonly number\[\]/g, '')
    .replace(/: ReadonlyArray<\{ name: string; tileIds: readonly number\[\] \}>/g, '')
    .replace(/new Set<number>\(/g, 'new Set(')
    .replace(/WALKABLE_TILE_ID_GROUPS: ReadonlyArray<\{ name: string; tileIds: readonly number\[\] \}>/, 'WALKABLE_TILE_ID_GROUPS =')
    .replace(/export const WALKABLE_TILE_ID_GROUPS\s*:[^=]*?=/, 'export const WALKABLE_TILE_ID_GROUPS =')
    .replace(/export const ABOVE_PLAYER_TILE_GROUPS\s*:[^=]*?=/, 'export const ABOVE_PLAYER_TILE_GROUPS =')
    .replace(/WALKABLE_TILE_ID_GROUPS\s*:\s*\r?\n/, 'WALKABLE_TILE_ID_GROUPS = []\n')
    .replace(/const (WALKABLE_TILE_ID_GROUPS)\s*\r?\n/, 'const $1 = []\n')
    .replace(/tileIndex: number\): boolean/, 'tileIndex) {')
    .replace(/(function isWalkableTile\(tileIndex\))\s*\{\s*\{/, '$1 {')
    .replace(/\(from: number, to: number\)/, '(from, to)')
  return import('data:text/javascript;base64,' + Buffer.from(stripped).toString('base64'))
}
const regionRules = await importRuleModule('../src/game/map/villageRegionRules.ts')
const walkBehind = regionRules.VILLAGE_WALK_BEHIND_CELLS
const forceSolid = regionRules.VILLAGE_FORCE_SOLID_CELLS
const fenceOverlay = regionRules.VILLAGE_FENCE_OVERLAY_CELLS
const walkableIdsModule = await importRuleModule('../src/game/map/walkableTileIds.ts')
const WALKABLE_TILE_IDS = walkableIdsModule.WALKABLE_TILE_IDS
const aboveModule = await importRuleModule('../src/game/map/abovePlayerTileIds.ts')
const NON_SOLID_OVERHANG_TILE_IDS = aboveModule.NON_SOLID_OVERHANG_TILE_IDS

const mainSceneSrc = fs.readFileSync(new URL('../src/game/scenes/MainScene.ts', import.meta.url), 'utf8')
const pillarBlock = mainSceneSrc.slice(
  mainSceneSrc.indexOf('const VILLAGE_PILLAR_OVERHANGS = new Set(['),
  mainSceneSrc.indexOf('])', mainSceneSrc.indexOf('const VILLAGE_PILLAR_OVERHANGS = new Set([')) + 2,
)
const pillarCells = new Set([...pillarBlock.matchAll(/'(\d+,\d+)'/g)].map((m) => m[1]))

const obstacles = map.layers.find((l) => l.name === '1_Obstacles')
const gidAt = (x, y) => Array.isArray(obstacles.data) ? obstacles.data[y * map.width + x] : obstacles.data[y][x]

function isSolid(x, y) {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return true
  const cell = `${x},${y}`
  if (forceSolid.has(cell) || fenceOverlay.has(cell)) return true
  const gid = gidAt(x, y)
  if (gid === 0) return false
  const isNonColliding =
    WALKABLE_TILE_IDS.has(gid) || NON_SOLID_OVERHANG_TILE_IDS.has(gid) || pillarCells.has(cell) || walkBehind.has(cell)
  return !isNonColliding
}

const regionArg = process.argv[2]
if (regionArg) {
  const [rx0, ry0, rx1, ry1] = regionArg.split(',').map(Number)
  for (let y = ry0; y <= ry1; y++) {
    const row = []
    for (let x = rx0; x <= rx1; x++) row.push(isSolid(x, y) ? '#' : '.')
    console.log(String(y).padStart(2), row.join(''))
  }
  console.log('columns', rx0, '->', rx1)
  process.exit(0)
}

// Reachability components
let componentId = 0
const seen = new Set()
for (let y = 0; y < map.height; y++) {
  for (let x = 0; x < map.width; x++) {
    const key = `${x},${y}`
    if (seen.has(key) || isSolid(x, y)) continue
    componentId++
    const queue = [{ x, y }]
    seen.add(key)
    const cells = []
    while (queue.length) {
      const { x: cx, y: cy } = queue.shift()
      cells.push(`${cx},${cy}`)
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy
        const nk = `${nx},${ny}`
        if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue
        if (seen.has(nk) || isSolid(nx, ny)) continue
        seen.add(nk)
        queue.push({ x: nx, y: ny })
      }
    }
    if (cells.length >= 6) {
      const xs = cells.map((c) => Number(c.split(',')[0]))
      const ys = cells.map((c) => Number(c.split(',')[1]))
      console.log(
        `component ${componentId}: ${cells.length} tiles, x ${Math.min(...xs)}-${Math.max(...xs)}, y ${Math.min(...ys)}-${Math.max(...ys)}, containsSpawn=${cells.includes('17,25')}`,
      )
    }
  }
}
console.log(`map ${map.width}x${map.height}, tile ${map.tilewidth}x${map.tileheight}`)
