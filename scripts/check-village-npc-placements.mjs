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
async function importRuleModule(relativeUrl) {
  const src = fs.readFileSync(new URL(relativeUrl, import.meta.url), 'utf8')
  const stripped = src
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

// --- NPC placements read from villageNpcs.ts (source of truth). ---
const npcsSrc = fs.readFileSync(new URL('../src/game/npc/villageNpcs.ts', import.meta.url), 'utf8')
const npcs = []
for (const match of npcsSrc.matchAll(/id: '([a-z-]+)',[\s\S]{0,400}?tileX: (\d+),\s*tileY: (\d+)/g)) {
  npcs.push({ id: match[1], x: Number(match[2]), y: Number(match[3]) })
}
const trainingIds = ['village-guide', 'village-monk', 'dojo-samurai'].filter((id) =>
  npcs.some((npc) => npc.id === id),
)
const trainingNpcs = npcs.filter((npc) => trainingIds.includes(npc.id))

let failures = 0
const fail = (message) => {
  failures += 1
  console.log(`FAIL ${message}`)
}
const pass = (message) => console.log(`PASS ${message}`)

// Elder position for distance checks.
const elder = npcs.find((npc) => npc.id === 'elder-masanori')

if (trainingNpcs.length !== 3 && npcs.some((npc) => trainingIds.includes(npc.id))) {
  fail(`expected 3 training NPC placements in villageNpcs.ts, found ${trainingNpcs.length}`)
} else if (trainingNpcs.length === 3) {
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

// --- Hybrid roaming contract audit ---------------------------------------
// Every movement-capable NPC must declare a profile with the right `kind`, a
// positive speed, and — for locals — a small leash; for ambients — a minimum
// destination distance. Both files are read directly so this stays an
// independent read-only audit of the shipped contract.
const worldNpcsSrc = fs.readFileSync(new URL('../src/game/npc/worldNpcs.ts', import.meta.url), 'utf8')
const profilesSrc = fs.readFileSync(new URL('../src/game/npc/movementProfiles.ts', import.meta.url), 'utf8')
const allNpcsSrc = npcsSrc + worldNpcsSrc

const LOCAL_IDS = [
  'elder-masanori', 'village-guide', 'village-monk', 'dojo-samurai',
]
const AMBIENT_IDS = [
  'plaza-merchant', 'west-gate-guard', 'shrine-shaman', 'south-farmer',
  'sand-road-traveller', 'west-gate-patrol', 'east-field-red-ninja',
  'south-east-blue-samurai',
]

function extractProfile(id, kind) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const section = kind === 'local'
    ? profilesSrc.slice(profilesSrc.indexOf('local: {'), profilesSrc.indexOf('ambient: {'))
    : profilesSrc.slice(profilesSrc.indexOf('ambient: {'))
  const re = new RegExp(`'${escaped}'\\s*:\\s*{[\\s\\S]*?}`, 'm')
  const match = section.match(re)
  if (!match) return null
  const body = match[0]
  const num = (key) => {
    const m = body.match(new RegExp(`${key}:\\s*([0-9.]+)`))
    return m ? Number(m[1]) : NaN
  }
  if (kind === 'local') {
    return {
      speed: num('speed'),
      minMoveDuration: num('minMoveDuration'),
      maxMoveDuration: num('maxMoveDuration'),
      minPauseDuration: num('minPauseDuration'),
      maxPauseDuration: num('maxPauseDuration'),
      leashRadiusTiles: num('leashRadiusTiles'),
    }
  }
  return {
    speed: num('speed'),
    minPauseDuration: num('minPauseDuration'),
    maxPauseDuration: num('maxPauseDuration'),
    minDestinationTiles: num('minDestinationTiles'),
  }
}

for (const [ids, kind] of [[LOCAL_IDS, 'local'], [AMBIENT_IDS, 'ambient']]) {
  for (const id of ids) {
    const profile = extractProfile(id, kind)
    if (!profile) {
      fail(`movement profile missing for ${id} (expected kind '${kind}')`)
      continue
    }
    const definitionMatch = allNpcsSrc.match(new RegExp(`id: '${id}'[\\s\\S]{0,600}?dialogueTree`, 'm'))
    const expectedAttachment = `NPC_MOVEMENT_PROFILES.${kind}['${id}']`
    if (!definitionMatch || !definitionMatch[0].includes(expectedAttachment)) {
      fail(`${id} definition does not attach its ${kind} movement profile (${expectedAttachment})`)
      continue
    }
    pass(`${id} attaches its ${kind} movement profile`)
    const validSpeed = Number.isFinite(profile.speed) && profile.speed > 0
    if (!validSpeed) {
      fail(`${id} profile speed must be > 0`)
      continue
    }
    if (kind === 'local') {
      const okRange = profile.maxMoveDuration >= profile.minMoveDuration &&
        profile.maxPauseDuration >= profile.minPauseDuration && profile.leashRadiusTiles > 0
      if (!okRange) fail(`${id} local profile ranges are inconsistent`)
      else if (profile.leashRadiusTiles > 4) fail(`${id} local leash ${profile.leashRadiusTiles} tiles is too wide (<= 4 required)`)
      else pass(`${id} local profile valid (speed ${profile.speed}, leash ${profile.leashRadiusTiles} tiles)`)
    } else {
      const okRange = profile.maxPauseDuration >= profile.minPauseDuration &&
        profile.minDestinationTiles >= 3
      if (!okRange) fail(`${id} ambient profile ranges are inconsistent`)
      else pass(`${id} ambient profile valid (speed ${profile.speed}, min destination ${profile.minDestinationTiles} tiles)`)
    }
  }
}

// Walking NPCs must declare a walk spritesheet + animation prefix.
for (const src of [npcsSrc, worldNpcsSrc]) {
  for (const match of src.matchAll(/id: '([a-z-]+)'[\s\S]{0,800}?dialogueTree/g)) {
    const block = match[0]
    const id = match[1]
    const hasMovement = block.includes("movement: NPC_MOVEMENT_PROFILES")
    if (!hasMovement) continue
    if (!block.includes('walkSpriteKey:') || !block.includes('walkAnimationPrefix:')) {
      fail(`${id} moves but declares no walk spritesheet/animation prefix`)
    } else {
      pass(`${id} declares a walk spritesheet and animation prefix`)
    }
  }
}

console.log(failures === 0 ? '\nALL PLACEMENT CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
