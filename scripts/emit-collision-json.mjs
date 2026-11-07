#!/usr/bin/env node
/**
 * Emits the derived collision data (solid map + region assignment per NPC
 * block) as JSON on stdout, for the vitest suite to consume without needing
 * JSON modules or node built-ins under Vite's browser TS config.
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
    .replace(/export const WALKABLE_TILE_ID_GROUPS\s*:[^=]*?=/, 'export const WALKABLE_TILE_ID_GROUPS =')
    .replace(/export const ABOVE_PLAYER_TILE_GROUPS\s*:[^=]*?=/, 'export const ABOVE_PLAYER_TILE_GROUPS =')
    .replace(/WALKABLE_TILE_ID_GROUPS\s*:\s*\r?\n/, 'WALKABLE_TILE_ID_GROUPS = []\n')
    // The walkableTileIds source splits the typed declaration across lines:
    //   export const WALKABLE_TILE_ID_GROUPS: ReadonlyArray<...> = [
    // The annotation must be stripped on the same line, not left dangling.
    .replace(/WALKABLE_TILE_ID_GROUPS\s*:\s*ReadonlyArray<\{ name: string; tileIds: readonly number\[\] \}>\s*=/, 'WALKABLE_TILE_ID_GROUPS =')
    .replace(/tileIndex: number\): boolean/, 'tileIndex) {')
    .replace(/(function isWalkableTile\(tileIndex\))\s*\{\s*\{/, '$1 {')
    .replace(/\(from: number, to: number\)/, '(from, to)')
    // Repair the truncated `WALKABLE_TILE_ID_GROUPS: ReadonlyArray<...> = [` split
    // declaration (type annotation on its own line) that the regexes above
    // cannot fully collapse.
    .replace(/WALKABLE_TILE_ID_GROUPS\s*:\s*ReadonlyArray<\{ name: string; tileIds: readonly number\[\] \}>\s*=\s*\[/, 'WALKABLE_TILE_ID_GROUPS = [')
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
const gidAt = (x, y) => (Array.isArray(obstacles.data) ? obstacles.data[y * map.width + x] : obstacles.data[y][x])
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
const solid = []
for (let y = 0; y < map.height; y++) {
  for (let x = 0; x < map.width; x++) if (isSolid(x, y)) solid.push(`${x},${y}`)
}
console.log(JSON.stringify({ width: map.width, height: map.height, solid }))
