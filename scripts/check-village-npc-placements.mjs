#!/usr/bin/env node
/**
 * READ-ONLY placement verification for the Village Training Route NPCs.
 *
 *   node scripts/check-village-npc-placements.mjs
 *
 * Re-derives the game's own collision rules (see MainScene.setupObstacleCollisions)
 * from the authored map and region rules, then verifies that each NPC placement
 * from src/game/npc/villageNpcs.ts:
 *
 *   1. stands on a tile the player can actually walk to (non-solid, with a
 *      connected walkable route from the player spawn),
 *   2. is not adjacent-solid-sealed (the NPC needs at least one adjacent
 *      walkable tile so the player can stand next to them and interact),
 *   3. keeps important map anchors (Elder post, spawn, torii approach, west
 *      gate, compound doors, sand road) reachable,
 *   4. is far enough from the Elder and from the other two training NPCs that
 *      interaction zones do not overlap (48px interaction radius = 3 tiles).
 *
 * It never writes map data. Exit code 0 = all checks passed.
 */
import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const map = require('../src/assets/tiles/ninja-village/MAP.json')

// --- Re-derive the village region rules exactly like the game does. ---
// The .ts rule files are plain data; strip TypeScript-only type annotations
// the same way check-upper-village-roofs.mjs does and import them.
async function importRuleModule(relativeUrl, extraReplacements = []) {
  const src = fs.readFileSync(new URL(relativeUrl, import.meta.url), 'utf8')
  let stripped = src
  for (const extra of extraReplacements) {
    stripped = stripped.replace(extra[0], extra[1])
  }
  stripped = stripped
    .replace(/: Set<string>|: string\[\]|: ReadonlySet<number>|: number\[\]/g, '')
  .replace(/function expandRect\(x0: number, x1: number, y0: number, y1: number\)/, 'function expandRect(x0, x1, y0, y1)')
    .replace(/: ReadonlySet<number>/g, '')
    .replace(/: Set<number>/g, '')
    .replace(/: readonly number\[\]/g, '')
    .replace(/: ReadonlyArray<\{ name: string; tileIds: readonly number\[\] \}>/g, '')
    .replace(/new Set<number>\(/g, 'new Set(')
    .replace(/WALKABLE_TILE_ID_GROUPS: ReadonlyArray<\{ name: string; tileIds: readonly number\[\] \}>/, 'WALKABLE_TILE_ID_GROUPS =')
    .replace(/ReadonlyArray<\{ name: string; tileIds \}>/g, '')
    .replace(/ReadonlyArray<\{ name: string; tileIds: readonly number\[\] \}>/g, '')
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
const npcSafeAreas = await importRuleModule('../src/game/map/npcSafeAreas.ts', [
  // Strip TypeScript type-only syntax that plain Node cannot parse.
  [/export type NpcRegionId[\s\S]*?(?=\/\*\* Inclusive tile bounds)/, ''],
  [/export const NPC_REGIONS\s*:\s*[\s\S]*?=\s*\{/, 'export const NPC_REGIONS = {'],
  [/export const NPC_TREE_EXCLUDED_CELLS\s*:\s*ReadonlySet<string>\s*=/, 'export const NPC_TREE_EXCLUDED_CELLS ='],
  [/export const NPC_SPAWN_EXCLUDED_CELLS\s*:\s*ReadonlySet<string>\s*=/, 'export const NPC_SPAWN_EXCLUDED_CELLS ='],
  [/export type NpcPlacementResult[\s\S]*?reason: string \}/, ''],
  [/\/\*\*[\s\S]*?\*\/\n(?=export function validateNpcPlacement)/, ''],
  [/\/\*\*[\s\S]*?\*\/\n(?=export type NpcPlacementResult)/, ''],
  [/tileX: number,/g, 'tileX,'],
  [/tileY: number\)/g, 'tileY)'],
  [/y: number\)/g, 'y)'],
  [/import \{ NPC_TILE_SIZE \} from '..\/npc\/roamAi'/g, 'const NPC_TILE_SIZE = 16'],
  [/import \{\s*NPC_TILE_SIZE\s*,?\s*\}\s*from\s*'[^']*'/g, 'const NPC_TILE_SIZE = 16'],
  [/as NpcRegionId\[\]\)/g, ')'],
  [/ as NpcRegionId\[\]/g, ''],
  [/tileY: number,/g, 'tileY,'],
  [/mapWidth: number,/g, 'mapWidth,'],
  [/mapHeight: number,/g, 'mapHeight,'],
  [/mapWidth: number,\n/g, 'mapWidth,\n'],
  [/regionId: NpcRegionId,/g, 'regionId,'],
  [/\(\s*\n\s*x,\n/g, '(\n  x,\n'],
  [/\): boolean \{/g, ') {'],
  [/\): NpcRegionId \| null \{/g, ') {'],
  [/\): \{ tileX: number; tileY: number \} \{/g, ') {'],
  [/\): NpcPlacementResult \{/g, ') {'],
  [/x: number,\n/g, 'x,\n'],
  [/x: number, y/g, 'x, y'],
  [/x,/g, 'x,'],
  [/\{ tileX: number; tileY: number \}/g, ''],
  [/\: ReadonlySet<string>/g, ''],
  [/\: Readonly<[\s\S]*?>/g, ''],
])
const npcRegionForTile = npcSafeAreas.npcRegionForTile
const validateNpcPlacement = npcSafeAreas.validateNpcPlacement

// VILLAGE_WALK_BEHIND_CELLS + VILLAGE_PILLAR_OVERHANGS equivalents.
// MainScene composes VILLAGE_PILLAR_OVERHANGS = stone pillars + west/central/
// east house roofs + tall props + ...VILLAGE_WALK_BEHIND_CELLS. Only the
// walk-behind cells matter for collision (roof cells here are also walk-behind
// style); the pillar list above duplicates region cells, so we mirror the
// region rules file, which is the shared source of truth.
const walkBehind = regionRules.VILLAGE_WALK_BEHIND_CELLS
const forceSolid = regionRules.VILLAGE_FORCE_SOLID_CELLS
const fenceOverlay = regionRules.VILLAGE_FENCE_OVERLAY_CELLS

// Walkable tile IDs from src/game/map/walkableTileIds.ts (imported the same way).
const walkableIdsModule = await importRuleModule('../src/game/map/walkableTileIds.ts')
const WALKABLE_TILE_IDS = walkableIdsModule.WALKABLE_TILE_IDS

// Non-solid overhang tile IDs from src/game/map/abovePlayerTileIds.ts.
const aboveModule = await importRuleModule('../src/game/map/abovePlayerTileIds.ts')
const NON_SOLID_OVERHANG_TILE_IDS = aboveModule.NON_SOLID_OVERHANG_TILE_IDS

// VILLAGE_PILLAR_OVERHANGS from MainScene: parse the literal cell list so we
// do not duplicate the data here. Cells are quoted 'x,y' strings in the source.
const mainSceneSrc = fs.readFileSync(
  new URL('../src/game/scenes/MainScene.ts', import.meta.url),
  'utf8',
)
const pillarBlock = mainSceneSrc.slice(
  mainSceneSrc.indexOf('const VILLAGE_PILLAR_OVERHANGS = new Set(['),
  mainSceneSrc.indexOf('])', mainSceneSrc.indexOf('const VILLAGE_PILLAR_OVERHANGS = new Set([')) + 2,
)
const pillarCells = new Set([...pillarBlock.matchAll(/'(\d+,\d+)'/g)].map((m) => m[1]))

const obstacles = map.layers.find((l) => l.name === '1_Obstacles')
const gidAt = (x, y) => {
  const data = Array.isArray(obstacles.data) ? obstacles.data[y * map.width + x] : obstacles.data[y][x]
  return data
}

/** Mirror of MainScene.setupObstacleCollisions(): is this cell solid? */
function isSolid(x, y) {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return true
  const cell = `${x},${y}`
  if (forceSolid.has(cell) || fenceOverlay.has(cell)) return true
  const gid = gidAt(x, y)
  if (gid === 0) return false // empty obstacle tile: walkable ground
  const isNonColliding =
    WALKABLE_TILE_IDS.has(gid) || NON_SOLID_OVERHANG_TILE_IDS.has(gid) || pillarCells.has(cell) || walkBehind.has(cell)
  return !isNonColliding
}

// --- BFS reachability from the player spawn (17.5, 25.5 tiles -> tile 17,25). ---
const spawn = { x: 17, y: 25 }
const reachable = new Set()
const queue = [spawn]
reachable.add(`${spawn.x},${spawn.y}`)
while (queue.length) {
  const { x, y } = queue.shift()
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx
    const ny = y + dy
    const key = `${nx},${ny}`
    if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue
    if (reachable.has(key)) continue
    if (isSolid(nx, ny)) continue
    reachable.add(key)
    queue.push({ x: nx, y: ny })
  }
}

// --- Anchors that must stay reachable. Coordinates verified against the map
// data: (1,10) is behind the gate fence (always sealed — the gate itself opens
// the passage, not the tile), and the compound door tiles are solid doorways
// the player walks *through* via adjacent open tiles, so their adjacent
// approach tiles are the meaningful anchors, not the door tiles themselves.
const anchors = [
  { name: 'player spawn', x: 17, y: 25 },
  { name: 'Elder post approach (5,27)', x: 5, y: 27 },
  { name: 'Elder post approach (6,28)', x: 6, y: 28 },
  { name: 'torii approach (12,24)', x: 12, y: 24 },
  { name: 'gate corridor (5,7)', x: 5, y: 7 },
  { name: 'compound door west approach (16,19)', x: 16, y: 19 },
  { name: 'compound door east approach (21,19)', x: 21, y: 19 },
  { name: 'south stairs (6,31)', x: 6, y: 31 },
]

// --- NPC placements read from villageNpcs.ts and worldNpcs.ts (source of truth). ---
const npcsSrc = fs.readFileSync(new URL('../src/game/npc/villageNpcs.ts', import.meta.url), 'utf8')
const worldNpcsSrc = fs.readFileSync(new URL('../src/game/npc/worldNpcs.ts', import.meta.url), 'utf8')
const npcs = []
for (const match of npcsSrc.matchAll(/id: '([a-z-]+)',[\s\S]{0,500}?tileX: (\d+),[\s\S]{0,120}?tileY: (\d+)/g)) {
  npcs.push({ id: match[1], x: Number(match[2]), y: Number(match[3]) })
}
const worldNpcCountBefore = npcs.length
for (const match of worldNpcsSrc.matchAll(/id: '([a-z-]+)',[\s\S]{0,500}?tileX: (\d+),[\s\S]{0,120}?tileY: (\d+)/g)) {
  npcs.push({ id: match[1], x: Number(match[2]), y: Number(match[3]) })
}
console.log(`village NPC placements: ${worldNpcCountBefore}, world ambient NPC placements: ${npcs.length - worldNpcCountBefore}`)
const trainingIds = ['village-guide', 'village-monk', 'dojo-samurai']
const trainingNpcs = npcs.filter((npc) => trainingIds.includes(npc.id))

// Active population target: 8 main + 4 ambient = 12 total.
const AMBIENT_IDS = new Set(['sand-road-traveller', 'west-gate-patrol', 'east-field-red-ninja', 'south-east-blue-samurai'])
const TARGET_TOTAL = 12
const TARGET_AMBIENT = 4
const TARGET_MAIN = 8
const ambientNpcs = npcs.filter((npc) => AMBIENT_IDS.has(npc.id))
const mainNpcs = npcs.filter((npc) => !AMBIENT_IDS.has(npc.id))
const expectedPreGateIds = new Set(['elder-masanori'])
const expectedMainVillageIds = new Set(['village-guide', 'village-monk', 'west-gate-guard', 'shrine-shaman', 'south-farmer'])
const expectedMainDungeonIds = new Set(['dojo-samurai', 'plaza-merchant'])
const expectedVillageAmbientIds = new Set(['sand-road-traveller', 'west-gate-patrol'])
const expectedSnowAmbientIds = new Set(['south-east-blue-samurai'])
const expectedDungeonAmbientIds = new Set(['east-field-red-ninja'])
const spatialArea = (npc) => {
  if (npc.id === 'elder-masanori') return 'pre-gate'
  if (npc.x >= 24) return 'dungeon-desert'
  if (npc.y >= 29) return 'snow'
  return 'main-village'
}
const spatialSubarea = (npc) => {
  if (npc.x >= 24) {
    if (npc.y < 14) return 'dungeon-upper'
    if (npc.y < 20) return 'dungeon-middle'
    if (npc.y < 24) return 'dungeon-lower'
    return 'dungeon-entrance'
  }
  if (npc.id === 'elder-masanori') return 'pre-gate-approach'
  if (npc.y >= 29) return 'snow-outer-path'
  if (npc.y >= 20) return 'village-lower'
  if (npc.x < 10) return 'village-west'
  if (npc.x < 17) return 'village-central'
  return 'village-market'
}

let failures = 0
const fail = (message) => {
  failures += 1
  console.log(`FAIL ${message}`)
}
const pass = (message) => console.log(`PASS ${message}`)

// Elder position for distance checks.
const elder = npcs.find((npc) => npc.id === 'elder-masanori')

// --- Active population target ------------------------------------------------
if (npcs.length !== TARGET_TOTAL) {
  fail(`expected ${TARGET_TOTAL} active NPCs, found ${npcs.length}`)
} else {
  pass(`active population is exactly ${TARGET_TOTAL} NPCs`)
}
if (ambientNpcs.length !== TARGET_AMBIENT) {
  fail(`expected ${TARGET_AMBIENT} ambient NPCs, found ${ambientNpcs.length}`)
} else {
  pass(`ambient population is exactly ${TARGET_AMBIENT} NPCs`)
}
if (mainNpcs.length !== TARGET_MAIN) {
  fail(`expected ${TARGET_MAIN} main NPCs, found ${mainNpcs.length}`)
} else {
  pass(`main population is exactly ${TARGET_MAIN} NPCs`)
}
for (const [label, expected, actual] of [
  ['pre-gate Elder', expectedPreGateIds, mainNpcs.filter((npc) => expectedPreGateIds.has(npc.id))],
  ['village main', expectedMainVillageIds, mainNpcs.filter((npc) => expectedMainVillageIds.has(npc.id))],
  ['dungeon/desert main', expectedMainDungeonIds, mainNpcs.filter((npc) => expectedMainDungeonIds.has(npc.id))],
  ['village ambient', expectedVillageAmbientIds, ambientNpcs.filter((npc) => expectedVillageAmbientIds.has(npc.id))],
  ['snow ambient', expectedSnowAmbientIds, ambientNpcs.filter((npc) => expectedSnowAmbientIds.has(npc.id))],
  ['dungeon/desert ambient', expectedDungeonAmbientIds, ambientNpcs.filter((npc) => expectedDungeonAmbientIds.has(npc.id))],
]) {
  if (actual.length !== expected.size || actual.some((npc) => !expected.has(npc.id))) {
    fail(`${label} allocation is incorrect`)
  } else {
    pass(`${label} allocation is ${actual.length}`)
  }
}
const spatialCounts = new Map()
for (const npc of npcs) {
  const area = spatialArea(npc)
  spatialCounts.set(area, (spatialCounts.get(area) ?? 0) + 1)
  console.log(`SPATIAL ${npc.id}: (${npc.x},${npc.y}) -> ${area}`)
}
for (const [area, expected] of [['pre-gate', 1], ['main-village', 7], ['dungeon-desert', 3], ['snow', 1]]) {
  const actual = spatialCounts.get(area) ?? 0
  if (actual !== expected) fail(`${area} has ${actual} NPCs, expected ${expected}`)
  else pass(`${area}: ${actual} NPCs by actual coordinates`)
}
const preGateAmbient = ambientNpcs.filter((npc) => spatialArea(npc) === 'pre-gate')
if (preGateAmbient.length !== 0) fail(`pre-gate approach has ${preGateAmbient.length} ambient NPCs`)
else pass('pre-gate approach has no ambient NPCs')
const subareaCounts = new Map()
for (const npc of npcs) {
  const subarea = spatialSubarea(npc)
  subareaCounts.set(subarea, (subareaCounts.get(subarea) ?? 0) + 1)
}
for (const [subarea, count] of subareaCounts) {
  pass(`${subarea}: ${count} NPC(s)`)
}
const requiredSubareas = [
  'village-west',
  'village-central',
  'village-market',
  'village-lower',
  'snow-outer-path',
  'dungeon-upper',
  'dungeon-middle',
  'dungeon-lower',
  'pre-gate-approach',
]
for (const subarea of requiredSubareas) {
  if (!subareaCounts.has(subarea)) fail(`${subarea} is unused`)
}
console.log('PAIRWISE SPATIAL DISTANCES')
for (let i = 0; i < npcs.length; i += 1) {
  for (let j = i + 1; j < npcs.length; j += 1) {
    const a = npcs[i]
    const b = npcs[j]
    const distance = Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
    console.log(`DIST ${a.id}<->${b.id}: ${distance} tiles / ${distance * 16}px`)
    if (distance < 4) fail(`${a.id} and ${b.id} are too close at ${distance} tiles`)
  }
}
// Every patrol route must span at least two distinct regions so the roamers
// visibly travel rather than circling one block.
for (const npc of ambientNpcs) {
  const patrolSrc = worldNpcsSrc.slice(worldNpcsSrc.indexOf(`id: '${npc.id}'`))
  const routeSrc = patrolSrc.slice(0, patrolSrc.indexOf('dialogueTree:'))
  const waypointRegions = new Set()
  for (const waypoint of routeSrc.matchAll(/\{ x: (\d+), y: (\d+) \}/g)) {
    const region = spatialSubarea({ x: Number(waypoint[1]), y: Number(waypoint[2]) })
    if (region) waypointRegions.add(region)
  }
  const waypoints = [...routeSrc.matchAll(/\{ x: (\d+), y: (\d+) \}/g)]
    .map((match) => ({ x: Number(match[1]), y: Number(match[2]) }))
  const xSpan = Math.max(...waypoints.map((waypoint) => waypoint.x)) - Math.min(...waypoints.map((waypoint) => waypoint.x))
  const ySpan = Math.max(...waypoints.map((waypoint) => waypoint.y)) - Math.min(...waypoints.map((waypoint) => waypoint.y))
  if (expectedVillageAmbientIds.has(npc.id) && waypointRegions.size < 2) {
    fail(`${npc.id} village patrol stays inside one region (${[...waypointRegions].join(', ')})`)
  } else if (expectedVillageAmbientIds.has(npc.id)) {
    pass(`${npc.id} village patrol crosses ${waypointRegions.size} regions: ${[...waypointRegions].join(', ')}`)
  } else if (expectedSnowAmbientIds.has(npc.id)) {
    pass(`${npc.id} stays in the outer snow patrol: ${[...waypointRegions].join(', ')}`)
  } else if (xSpan < 2 && ySpan < 2) {
    fail(`${npc.id} dungeon patrol has insufficient spatial span (${xSpan}x${ySpan} tiles)`)
  } else {
    pass(`${npc.id} dungeon patrol spans ${xSpan}x${ySpan} tiles across actual coordinates`)
  }
  if (expectedVillageAmbientIds.has(npc.id) && [...waypointRegions].some((region) => region.startsWith('dungeon-'))) {
    fail(`${npc.id} village patrol enters the dungeon`)
  }
}
const waypointUse = new Map()
for (const npc of ambientNpcs) {
  const patrolSrc = worldNpcsSrc.slice(worldNpcsSrc.indexOf(`id: '${npc.id}'`))
  const routeSrc = patrolSrc.slice(0, patrolSrc.indexOf('dialogueTree:'))
  for (const waypoint of routeSrc.matchAll(/\{ x: (\d+), y: (\d+) \}/g)) {
    const key = `${waypoint[1]},${waypoint[2]}`
    const users = waypointUse.get(key) ?? []
    users.push(npc.id)
    waypointUse.set(key, users)
  }
}
let convergedWaypoint = false
for (const [waypoint, users] of waypointUse) {
  if (users.length > 2) {
    convergedWaypoint = true
    fail(`patrol waypoint ${waypoint} is shared by ${users.length} NPCs: ${users.join(', ')}`)
  }
}
if (!convergedWaypoint) pass('no patrol waypoint is shared by more than two NPCs')
// Maximum two main NPCs per region. Exception: the Elder/Guide/Monk trio is
// deliberately grouped around the central plaza dojo/story heart, and their
// separation is already enforced by the 4-tile interaction-spacing check.
const mainRegionCounts = new Map()
for (const npc of mainNpcs) {
  const region = npcRegionForTile(npc.x, npc.y) ?? 'UNASSIGNED'
  mainRegionCounts.set(region, (mainRegionCounts.get(region) ?? 0) + 1)
}
const STORY_CLUSTER_REGIONS = new Set(['central-plaza'])
const MAX_MAIN_PER_REGION = 2
for (const [region, count] of mainRegionCounts) {
  const cap = STORY_CLUSTER_REGIONS.has(region) ? 3 : MAX_MAIN_PER_REGION
  if (count > cap && region !== 'UNASSIGNED') {
    fail(`${region} holds ${count} main NPCs (max ${cap})`)
  } else if (region !== 'UNASSIGNED') {
    pass(`${region}: ${count} main NPC(s)`)
  } else {
    fail(`${count} main NPCs are outside every region`)
  }
}

if (trainingNpcs.length !== 3) {
  fail(`expected 3 training NPC placements in villageNpcs.ts, found ${trainingNpcs.length}`)
} else {
  const INTERACT_TILES = 3 // 48px interaction radius
  for (const npc of trainingNpcs) {
    const key = `${npc.x},${npc.y}`
    if (isSolid(npc.x, npc.y)) {
      fail(`${npc.id} at (${key}) stands on a solid tile`)
      continue
    }
    pass(`${npc.id} at (${key}) stands on a non-solid tile`)
    if (!reachable.has(key)) {
      fail(`${npc.id} at (${key}) is not reachable from the player spawn`)
    } else {
      pass(`${npc.id} at (${key}) is reachable from the player spawn`)
    }
    const openNeighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dx, dy]) => `${npc.x + dx},${npc.y + dy}`)
      .filter((k) => !isSolid(...k.split(',').map(Number)))
    if (openNeighbours.length === 0) {
      fail(`${npc.id} at (${key}) has no adjacent walkable tile to interact from`)
    } else {
      pass(`${npc.id} at (${key}) has ${openNeighbours.length} adjacent walkable tile(s)`)
    }
    if (elder) {
      const dist = Math.abs(npc.x - elder.x) + Math.abs(npc.y - elder.y)
      if (dist <= INTERACT_TILES) fail(`${npc.id} at (${key}) is too close to the Elder (Manhattan ${dist})`)
      else pass(`${npc.id} at (${key}) is ${dist} tiles from the Elder`)
    }
  }
  // Pairwise separation between the three training NPCs.
  for (let i = 0; i < trainingNpcs.length; i += 1) {
    for (let j = i + 1; j < trainingNpcs.length; j += 1) {
      const a = trainingNpcs[i]
      const b = trainingNpcs[j]
      const dist = Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
      if (dist <= INTERACT_TILES) {
        fail(`${a.id} (${a.x},${a.y}) and ${b.id} (${b.x},${b.y}) are only ${dist} tiles apart`)
      } else {
        pass(`${a.id} and ${b.id} are ${dist} tiles apart`)
      }
    }
  }
}

// Anchors must remain reachable after (conceptually) standing on the NPC tiles.
for (const anchor of anchors) {
  const key = `${anchor.x},${anchor.y}`
  if (reachable.has(key)) pass(`anchor reachable: ${anchor.name} (${key})`)
  else fail(`anchor NOT reachable: ${anchor.name} (${key})`)
}

// --- Second pass: treat every NPC tile as occupied and re-run reachability. ---
// An NPC's physics body blocks its tile, so the honest question is whether all
// anchors stay reachable when the player cannot path *through* the NPC tiles.
const occupied = new Set(npcs.map((npc) => `${npc.x},${npc.y}`))
function isSolidWithNpcs(x, y) {
  if (occupied.has(`${x},${y}`)) return true
  return isSolid(x, y)
}
const reachableWithNpcs = new Set([`${spawn.x},${spawn.y}`])
const queueWithNpcs = [spawn]
while (queueWithNpcs.length) {
  const { x, y } = queueWithNpcs.shift()
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx
    const ny = y + dy
    const key = `${nx},${ny}`
    if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue
    if (reachableWithNpcs.has(key)) continue
    if (isSolidWithNpcs(nx, ny)) continue
    reachableWithNpcs.add(key)
    queueWithNpcs.push({ x: nx, y: ny })
  }
}
for (const anchor of anchors) {
  const key = `${anchor.x},${anchor.y}`
  if (reachableWithNpcs.has(key)) {
    pass(`anchor reachable with NPCs occupied: ${anchor.name} (${key})`)
  } else {
    fail(`anchor NOT reachable with NPCs occupied: ${anchor.name} (${key})`)
  }
}
// Every non-NPC tile that was reachable before must still be reachable; this
// proves the NPCs do not seal any region of the walkable village.
let sealed = 0
for (const key of reachable) {
  if (occupied.has(key)) continue
  if (!reachableWithNpcs.has(key)) {
    sealed += 1
    fail(`walkable tile sealed by NPCs: (${key})`)
  }
}
if (sealed === 0) {
  pass(`no walkable tile is sealed by the ${occupied.size} NPC positions (${reachable.size} reachable tiles verified)`)
}

// --- Interaction-radius spacing ------------------------------------------
// INTERACT_RADIUS is 48px (3 tiles). Two NPCs closer than 4 tiles apart
// (Manhattan) can both sit inside the player's prompt radius, and prompt
// selection is first-match in VILLAGE_NPCS order, so the earlier NPC would
// shadow the later one. Flag any such pair.
{
  const minTiles = 4
  const problems = []
  for (let i = 0; i < npcs.length; i++) {
    for (let j = i + 1; j < npcs.length; j++) {
      const a = npcs[i]
      const b = npcs[j]
      const dist = Math.abs(a.tileX - b.tileX) + Math.abs(a.tileY - b.tileY)
      if (dist < minTiles) {
        problems.push(`${a.id} (${a.tileX},${a.tileY}) <-> ${b.id} (${b.tileX},${b.tileY}): ${dist} tiles`)
      }
    }
  }
  if (problems.length > 0) {
    console.error(`FAIL: interaction-radius spacing (${problems.length} pair(s) closer than ${minTiles} tiles):`)
    for (const p of problems) console.error(`  - ${p}`)
    process.exit(1)
  }
  console.log(`OK: interaction-radius spacing (all pairs >= ${minTiles} tiles apart)`)
}

// --- Region distribution audit ---------------------------------------------
// Every NPC must sit inside a declared NPC region (from npcSafeAreas.ts), and
// no single region may hold more than ~30% of the ambient population unless
// geography requires it. Educational/quest NPCs stay at their dedicated
// learning locations and are counted separately.
{
  const regionCounts = new Map()
  const noRegion = []
  for (const npc of npcs) {
    const region = npcRegionForTile(npc.x, npc.y)
    const key = region ?? 'UNASSIGNED'
    regionCounts.set(key, (regionCounts.get(key) ?? 0) + 1)
    if (!region) noRegion.push(npc)
  }
  if (noRegion.length > 0) {
    for (const npc of noRegion) fail(`${npc.id} at (${npc.x},${npc.y}) is outside every NPC region`)
  }
  const ambient = npcs.filter((npc) => AMBIENT_IDS.has(npc.id))
  const ambientCount = ambient.length
  const maxShare = 0.35
  const ambientRegionCounts = new Map()
  for (const npc of ambient) {
    const region = npcRegionForTile(npc.x, npc.y)
    if (region) ambientRegionCounts.set(region, (ambientRegionCounts.get(region) ?? 0) + 1)
  }
  for (const [region, count] of ambientRegionCounts) {
    if (region === 'UNASSIGNED' || region.endsWith('-overlap')) continue
    const share = count / Math.max(ambientCount, 1)
    if (share > maxShare && count > 3) {
      fail(`${region} holds ${count}/${ambientCount} ambient NPCs (${Math.round(share * 100)}% > ${maxShare * 100}% cap)`)
    } else {
      pass(`${region}: ${count} NPC(s) (${Math.round(share * 100)}%)`)
    }
  }
  const populatedRegions = [...regionCounts.keys()].filter(
    (r) => r !== 'UNASSIGNED' && !r.endsWith('-overlap'),
  )
  if (populatedRegions.length < 5) {
    fail(`expected at least 5 populated regions, found ${populatedRegions.length}`)
  } else {
    pass(`${populatedRegions.length} regions are populated`)
  }
  // Player-spawn crowding: no more than 2 ambient NPCs within 6 tiles of spawn.
  const nearSpawn = ambient.filter(
    (npc) => Math.abs(npc.tileX - spawn.x) + Math.abs(npc.tileY - spawn.y) <= 6,
  )
  if (nearSpawn.length > 2) {
    fail(`${nearSpawn.length} ambient NPCs crowd the player spawn (max 2): ${nearSpawn.map((n) => n.id).join(', ')}`)
  } else {
    pass(`player spawn is not crowded (${nearSpawn.length} ambient NPCs within 6 tiles)`)
  }
}

console.log(failures === 0 ? '\nALL PLACEMENT CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
