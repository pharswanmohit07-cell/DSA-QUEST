#!/usr/bin/env node
/**
 * READ-ONLY audit of the NPC movement contract.
 *
 *   node scripts/npc-definition-audit.mjs
 *
 * Validates, against the TypeScript sources themselves (no map needed):
 *
 *   1. exactly four local NPCs and eight ambient NPCs are named in the contract,
 *   2. every one of them has a syntactically complete profile with sane ranges,
 *   3. every contract NPC's definition attaches the matching profile kind,
 *   4. every moving NPC declares a walk spritesheet and animation prefix,
 *   5. spawn tiles are inside the authored map bounds and distinct per NPC.
 *
 * Exit code 0 = all checks passed.
 */
import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const map = require('../src/assets/tiles/ninja-village/MAP.json')

const villageSrc = fs.readFileSync(new URL('../src/game/npc/villageNpcs.ts', import.meta.url), 'utf8')
const worldSrc = fs.readFileSync(new URL('../src/game/npc/worldNpcs.ts', import.meta.url), 'utf8')
const profilesSrc = fs.readFileSync(new URL('../src/game/npc/movementProfiles.ts', import.meta.url), 'utf8')
const allNpcsSrc = villageSrc + worldSrc

const LOCAL_IDS = [
  'elder-masanori', 'village-guide', 'village-monk', 'dojo-samurai',
]
const AMBIENT_IDS = [
  'plaza-merchant', 'west-gate-guard', 'shrine-shaman', 'south-farmer',
  'sand-road-traveller', 'west-gate-patrol', 'east-field-red-ninja',
  'south-east-blue-samurai',
]
const ALL_IDS = [...LOCAL_IDS, ...AMBIENT_IDS]

let failures = 0
const fail = (message) => { failures += 1; console.log(`FAIL ${message}`) }
const pass = (message) => console.log(`PASS ${message}`)

/** Extracts a definition block for an NPC id from the combined sources. */
function definition(id) {
  const match = allNpcsSrc.match(new RegExp(`id: '${id}'[\\s\\S]{0,900}?dialogueTree`, 'm'))
  return match ? match[0] : null
}

/** Extracts the numeric profile for an id/kind from movementProfiles.ts. */
function profile(id, kind) {
  const section = kind === 'local'
    ? profilesSrc.slice(profilesSrc.indexOf('local: {'), profilesSrc.indexOf('ambient: {'))
    : profilesSrc.slice(profilesSrc.indexOf('ambient: {'))
  const match = section.match(new RegExp(`'${id}'\\s*:\\s*{[\\s\\S]*?}`, 'm'))
  if (!match) return null
  const body = match[0]
  const num = (key) => {
    const m = body.match(new RegExp(`${key}:\\s*(-?[0-9.]+)`))
    return m ? Number(m[1]) : NaN
  }
  if (kind === 'local') {
    return {
      region: (body.match(/region:\s*'(village|dungeon|snow)'/) || [])[1] ?? null,
      speed: num('speed'),
      minMoveDuration: num('minMoveDuration'),
      maxMoveDuration: num('maxMoveDuration'),
      minPauseDuration: num('minPauseDuration'),
      maxPauseDuration: num('maxPauseDuration'),
      leashRadiusTiles: num('leashRadiusTiles'),
    }
  }
  return {
    region: (body.match(/region:\s*'(village|dungeon|snow)'/) || [])[1] ?? null,
    speed: num('speed'),
    minPauseDuration: num('minPauseDuration'),
    maxPauseDuration: num('maxPauseDuration'),
    minDestinationTiles: num('minDestinationTiles'),
  }
}

// --- 1b. Region identity contract -----------------------------------------
// Every one of the 12 movement NPCs must carry exactly one macro region and
// the population must match the planned 7 village / 3 dungeon / 2 snow split.
const REGION_TARGET = { village: 7, dungeon: 3, snow: 2 }
const regionCounts = { village: 0, dungeon: 0, snow: 0 }
for (const id of ALL_IDS) {
  const kind = LOCAL_IDS.includes(id) ? 'local' : 'ambient'
  const p = profile(id, kind)
  if (!p) continue
  if (!p.region || !['village', 'dungeon', 'snow'].includes(p.region)) {
    fail(`${id}: movement profile carries no valid macro region identity`)
  } else {
    pass(`${id}: macro region '${p.region}'`)
    regionCounts[p.region] += 1
  }
}
for (const [region, target] of Object.entries(REGION_TARGET)) {
  if (regionCounts[region] !== target) {
    fail(`regional population: ${regionCounts[region]} NPCs in '${region}', expected ${target}`)
  } else {
    pass(`regional population: exactly ${target} NPCs in '${region}'`)
  }
}
const plannedOrder = ['village', 'dungeon', 'snow']
for (let i = 0; i < plannedOrder.length - 1; i += 1) {
  const a = plannedOrder[i]
  const b = plannedOrder[i + 1]
  if (regionCounts[a] <= regionCounts[b]) {
    fail(`population ordering violated: '${a}' must exceed '${b}'`)
  }
}
if (
  regionCounts.village > regionCounts.dungeon &&
  regionCounts.dungeon > regionCounts.snow
) {
  pass("population ordering: village > dungeon > snow")
}

// 1. Contract composition -----------------------------------------------------
if (LOCAL_IDS.length !== 4) fail(`expected 4 local NPCs, found ${LOCAL_IDS.length}`)
else pass(`4 local NPCs declared`)
if (AMBIENT_IDS.length !== 8) fail(`expected 8 ambient NPCs, found ${AMBIENT_IDS.length}`)
else pass(`8 ambient NPCs declared`)
const overlap = LOCAL_IDS.filter((id) => AMBIENT_IDS.includes(id))
if (overlap.length > 0) fail(`NPC(s) in both local and ambient lists: ${overlap.join(', ')}`)
else pass('no NPC appears in both the local and ambient lists')
// The id literals must literally exist in movementProfiles.ts contract lists.
for (const id of ALL_IDS) {
  if (!profilesSrc.includes(`'${id}'`)) fail(`${id} missing from movementProfiles.ts contract`)
}
pass('all 12 contract ids appear in movementProfiles.ts')

// 2 + 3. Profiles and definition attachments ---------------------------------
for (const id of LOCAL_IDS) {
  const p = profile(id, 'local')
  if (!p) { fail(`${id}: no local profile`); continue }
  const ok = Number.isFinite(p.speed) && p.speed > 0 &&
    Number.isFinite(p.minMoveDuration) && p.minMoveDuration > 0 &&
    p.maxMoveDuration >= p.minMoveDuration &&
    p.maxPauseDuration >= p.minPauseDuration &&
    Number.isFinite(p.leashRadiusTiles) && p.leashRadiusTiles > 0 && p.leashRadiusTiles <= 4
  if (!ok) fail(`${id}: local profile invalid (${JSON.stringify(p)})`)
  else pass(`${id}: local profile valid (speed ${p.speed}, leash ${p.leashRadiusTiles} tiles)`)

  const def = definition(id)
  const attach = `NPC_MOVEMENT_PROFILES.local['${id}']`
  if (!def || !def.includes(attach)) fail(`${id}: definition does not attach ${attach}`)
  else pass(`${id}: attaches local profile`)
}

for (const id of AMBIENT_IDS) {
  const p = profile(id, 'ambient')
  if (!p) { fail(`${id}: no ambient profile`); continue }
  const ok = Number.isFinite(p.speed) && p.speed > 0 &&
    p.maxPauseDuration >= p.minPauseDuration &&
    Number.isFinite(p.minDestinationTiles) && p.minDestinationTiles >= 3
  if (!ok) fail(`${id}: ambient profile invalid (${JSON.stringify(p)})`)
  else pass(`${id}: ambient profile valid (speed ${p.speed}, min destination ${p.minDestinationTiles} tiles)`)

  const def = definition(id)
  const attach = `NPC_MOVEMENT_PROFILES.ambient['${id}']`
  if (!def || !def.includes(attach)) fail(`${id}: definition does not attach ${attach}`)
  else pass(`${id}: attaches ambient profile`)
}

// 4. Walk assets for every moving NPC ----------------------------------------
for (const id of ALL_IDS) {
  const def = definition(id)
  if (!def) { fail(`${id}: definition not found`); continue }
  if (!def.includes('walkSpriteKey:') || !def.includes('walkAnimationPrefix:')) {
    fail(`${id}: moving NPC without a walk spritesheet/animation prefix`)
  } else {
    pass(`${id}: walk spritesheet and animation prefix declared`)
  }
}

// 5. Spawn safety: in-bounds and pairwise-distinct tiles ----------------------
const spawnRegex = /id: '([a-z-]+)',[\s\S]{0,400}?tileX: (\d+),\s*tileY: (\d+)/g
const spawns = new Map()
for (const src of [villageSrc, worldSrc]) {
  for (const match of src.matchAll(spawnRegex)) {
    spawns.set(match[1], { x: Number(match[2]), y: Number(match[3]) })
  }
}
for (const id of ALL_IDS) {
  const tile = spawns.get(id)
  if (!tile) { fail(`${id}: no spawn tile found`); continue }
  const inBounds = tile.x >= 0 && tile.y >= 0 && tile.x < map.width && tile.y < map.height
  if (!inBounds) fail(`${id}: spawn (${tile.x},${tile.y}) outside the ${map.width}x${map.height} map`)
  else pass(`${id}: spawn (${tile.x},${tile.y}) inside map bounds`)
}
const seen = new Map()
for (const [id, tile] of spawns) {
  const key = `${tile.x},${tile.y}`
  const first = seen.get(key)
  if (first) fail(`${id} shares spawn tile ${key} with ${first}`)
  else seen.set(key, id)
}
if (seen.size === spawns.size) pass(`all ${spawns.size} NPC spawn tiles are distinct`)

console.log(failures === 0 ? '\nNPC DEFINITION AUDIT PASSED' : `\n${failures} AUDIT CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
