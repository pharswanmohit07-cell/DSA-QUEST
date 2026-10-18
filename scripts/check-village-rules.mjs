#!/usr/bin/env node
/**
 * Dev-only verification for the village region collision rules.
 *
 *   node scripts/check-village-rules.mjs
 *
 * Prints ASCII grids (# solid, B walk-behind, X solid + overlay, o walkable
 * art, . empty) for the three changed regions and asserts the rules:
 *  - every changed object: bottom row solid, rows above non-solid + overlay
 *  - compound perimeter all solid + overlay except the two door cells
 *  - house cells have no overlay
 *  - nothing outside the listed cells changed (full-map hash before/after)
 */
import fs from 'node:fs'
import { createHash } from 'node:crypto'

const mapPath = new URL('../src/assets/tiles/ninja-village/MAP.json', import.meta.url)
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'))

// ---- Load the rules module by stripping TS-specific syntax ---------------
const rulesSrc = fs.readFileSync(
  new URL('../src/game/map/villageRegionRules.ts', import.meta.url),
  'utf8'
)
const rulesJs = rulesSrc.replace(/: string\[\]/g, '')
const rulesModule = await import(
  'data:text/javascript;base64,' + Buffer.from(rulesJs).toString('base64')
)
const walkBehind = rulesModule.VILLAGE_WALK_BEHIND_CELLS
const fence = rulesModule.VILLAGE_FENCE_OVERLAY_CELLS

// ---- Extract pre-existing rule sets from MainScene.ts --------------------
const mainSrc = fs.readFileSync(new URL('../src/game/scenes/MainScene.ts', import.meta.url), 'utf8')

const extractBlock = (src, startMarker) => {
  const start = src.indexOf(startMarker)
  if (start === -1) return ''
  const end = src.indexOf('])', start)
  return src.slice(start, end + 2)
}

const pillar = new Set(
  [...extractBlock(mainSrc, 'VILLAGE_PILLAR_OVERHANGS').matchAll(/'(\d+,\d+)'/g)].map((m) => m[1])
)
const westForeground = new Set(
  [...extractBlock(mainSrc, 'WEST_HOUSE_FOREGROUND_CELLS').matchAll(/'(\d+,\d+)'/g)].map((m) => m[1])
)

const gidOf = (layerName, x, y) => {
  const layer = map.layers.find((l) => l.name === layerName)
  return layer.data[y][x]
}

const mapW = map.width
const mapH = map.height

// ---- Snapshot the state BEFORE the new rules -----------------------------
// Baseline = MAP.json obstacle solidity with the pre-existing rules already
// applied (pillar overhangs walk-behind, west-house foreground overlay). The
// new rules must only affect the cells they list.
const before = { solid: new Set(), overlay: new Set() }
for (let y = 0; y < mapH; y += 1) {
  for (let x = 0; x < mapW; x += 1) {
    if (gidOf('1_Obstacles', x, y) !== 0) before.solid.add(`${x},${y}`)
  }
}
const applyBaselineRules = (state) => {
  for (const cell of pillar) {
    if (state.solid.has(cell)) {
      state.solid.delete(cell)
      state.overlay.add(cell)
    }
  }
  for (const cell of westForeground) {
    if (state.solid.has(cell)) state.overlay.add(cell)
  }
}
applyBaselineRules(before)

// ---- Apply the NEW rules -------------------------------------------------
const after = { solid: new Set(before.solid), overlay: new Set(before.overlay) }
for (const cell of walkBehind) {
  after.solid.delete(cell)
  after.overlay.add(cell)
}
for (const cell of fence) {
  after.overlay.add(cell)
}

const hashOf = (s, o) =>
  createHash('sha256')
    .update([...s].sort().join('|') + '##' + [...o].sort().join('|'))
    .digest('hex')
    .slice(0, 12)

// ---- ASCII grids ---------------------------------------------------------
const char = (x, y) => {
  const c = `${x},${y}`
  if (after.overlay.has(c) && after.solid.has(c)) return 'X'
  if (after.overlay.has(c)) return 'B'
  if (after.solid.has(c)) return '#'
  return gidOf('1_Obstacles', x, y) !== 0 ? 'o' : '.'
}

const grid = (name, x0, x1, y0, y1) => {
  console.log(`\n=== ${name} ===`)
  console.log('     ' + Array.from({ length: x1 - x0 + 1 }, (_, i) => String(x0 + i).padStart(2)).join(' '))
  for (let y = y0; y <= y1; y += 1) {
    let row = `${String(y).padStart(4)} `
    for (let x = x0; x <= x1; x += 1) row += char(x, y) + ' '
    console.log(row)
  }
}

grid('East rocks (cols 24-34, rows 14-23)', 24, 34, 14, 23)
grid('Orange compound (cols 12-25, rows 12-20)', 12, 25, 12, 20)
grid('Dojo posts (cols 18-27, rows 17-22)', 18, 27, 17, 22)

// ---- Assertions ----------------------------------------------------------
let failed = 0
const assert = (cond, msg) => {
  if (cond) console.log(`  PASS  ${msg}`)
  else {
    console.log(`  FAIL  ${msg}`)
    failed += 1
  }
}

// CHANGE A: bottom rows solid, upper rows walk-behind
assert(['26,21', '27,21'].every((c) => after.solid.has(c)), 'A: 2x2 rock bottom row solid')
assert(['26,20', '27,20'].every((c) => !after.solid.has(c) && after.overlay.has(c)), 'A: 2x2 rock upper rows walk-behind')
assert([31, 32, 33, 34].every((x) => after.solid.has(`${x},20`)), 'A: pile bottom row solid')
assert(['32,18','33,18','34,18','31,19','32,19','33,19','34,19'].every((c) => !after.solid.has(c) && after.overlay.has(c)), 'A: pile upper rows walk-behind')
assert(after.solid.has('28,21'), 'A: single rock (28,21) stays solid')
assert(['29,14','30,14'].every((c) => after.solid.has(c)) && ['29,12','30,12','29,13','30,13'].every((c) => !after.solid.has(c) && after.overlay.has(c)), 'A: extra rocks 29-30 rows 12-14 pattern')
assert(['32,16','33,16'].every((c) => after.solid.has(c)) && ['32,15','33,15'].every((c) => !after.solid.has(c) && after.overlay.has(c)), 'A: extra rocks 32-33 rows 15-16 pattern')

// CHANGE B: perimeter
for (let x = 14; x <= 23; x += 1) {
  for (let y = 14; y <= 18; y += 1) {
    const isEdge = x === 14 || x === 23 || y === 14 || y === 18
    if (!isEdge) continue
    const c = `${x},${y}`
    const isDoor = c === '16,18' || c === '21,18'
    if (isDoor) assert(after.solid.has(c) === before.solid.has(c) && after.overlay.has(c) === before.overlay.has(c), `B: door ${c} unchanged`)
    else assert(after.solid.has(c) && after.overlay.has(c), `B: perimeter ${c} solid+overlay`)
  }
}
// houses: cols 15-22, rows 15-17 interior (no overlay)
let houseOk = true
for (let x = 15; x <= 22; x += 1) {
  for (let y = 15; y <= 17; y += 1) {
    if (after.overlay.has(`${x},${y}`)) houseOk = false
  }
}
assert(houseOk, 'B: house interior has no overlay')

// CHANGE C: dojo posts
assert([21, 23, 24].every((x) => after.solid.has(`${x},20`)), 'C: posts bottom row solid')
assert([21, 23, 24].every((x) => !after.solid.has(`${x},19`) && after.overlay.has(`${x},19`)), 'C: posts upper row walk-behind')

// ---- Nothing outside listed cells changed --------------------------------
const allChanged = new Set([...walkBehind, ...fence])
const outsideChanged = []
for (let y = 0; y < mapH; y += 1) {
  for (let x = 0; x < mapW; x += 1) {
    const c = `${x},${y}`
    if (allChanged.has(c)) continue
    if (before.solid.has(c) !== after.solid.has(c)) outsideChanged.push(`solid ${c}`)
    if (before.overlay.has(c) !== after.overlay.has(c)) outsideChanged.push(`overlay ${c}`)
  }
}
assert(
  outsideChanged.length === 0,
  `nothing outside listed cells changed${outsideChanged.length ? ' (' + outsideChanged.slice(0, 8).join(', ') + (outsideChanged.length > 8 ? `, +${outsideChanged.length - 8} more` : '') + ')' : ''}`
)

console.log('\nHashes (before -> after):')
console.log(`  before: ${hashOf(before.solid, before.overlay)}`)
console.log(`  after:  ${hashOf(after.solid, after.overlay)}`)
console.log(`  cells changed: walk-behind ${walkBehind.size}, fence overlay ${fence.size}`)

console.log(`\n${failed === 0 ? 'ALL CHECKS PASSED' : failed + ' CHECK(S) FAILED'}`)
process.exit(failed === 0 ? 0 : 1)
