#!/usr/bin/env node
/**
 * VERIFY-ONLY script for the upper-village roof task (columns 0-25, rows 0-13).
 *
 *   node scripts/check-upper-village-roofs.mjs
 *
 * Reports the tile IDs in the A/B/C/D change regions, the state of (12,8),
 * every walk-behind cell left in the upper half, ASCII grids before/after and
 * reachability of the sand road (0,6) -> (18,6). It changes nothing on disk.
 */
import fs from 'node:fs'
import { createHash } from 'node:crypto'

const map = JSON.parse(
  fs.readFileSync(new URL('../src/assets/tiles/ninja-village/MAP.json', import.meta.url), 'utf8')
)

const gidOf = (x, y) => {
  const layer = map.layers.find((l) => l.name === '1_Obstacles')
  return Array.isArray(layer.data) ? layer.data[y * map.width + x] : layer.data[y][x]
}

// The collision sets as the game computes them (mirrors MainScene.ts).
const rulesSrc = fs.readFileSync(
  new URL('../src/game/map/villageRegionRules.ts', import.meta.url),
  'utf8'
)
const rulesModule = await import(
  'data:text/javascript;base64,' +
    Buffer.from(rulesSrc.replace(/: Set<string>|: string\[\]|: ReadonlySet<number>/g, '')).toString('base64')
)
const walkBehind = rulesModule.VILLAGE_WALK_BEHIND_CELLS
const forceSolid = rulesModule.VILLAGE_FORCE_SOLID_CELLS

const mainSrc = fs.readFileSync(new URL('../src/game/scenes/MainScene.ts', import.meta.url), 'utf8')
const extractBlock = (src, marker) => {
  const start = src.indexOf(marker)
  const end = src.indexOf('])', start)
  return src.slice(start, end + 2)
}
const pillar = new Set(
  [...extractBlock(mainSrc, 'const VILLAGE_PILLAR_OVERHANGS').matchAll(/'(\d+,\d+)'/g)].map((m) => m[1])
)
const westOpen = new Set(
  [...extractBlock(mainSrc, 'const WEST_HOUSE_OPEN_CELLS').matchAll(/'(\d+,\d+)'/g)].map((m) => m[1])
)
const westForeground = new Set(
  [...extractBlock(mainSrc, 'const WEST_HOUSE_FOREGROUND_CELLS').matchAll(/'(\d+,\d+)'/g)].map((m) => m[1])
)
// GID sets from abovePlayerTileIds.ts (roof / canopy / boulder tops ...).
const aboveIdsSrc = fs.readFileSync(
  new URL('../src/game/map/abovePlayerTileIds.ts', import.meta.url),
  'utf8'
)
const gidNums = []
for (const m of aboveIdsSrc.matchAll(/range\((\d+),\s*(\d+)\)/g)) {
  for (let v = Number(m[1]); v <= Number(m[2]); v += 1) gidNums.push(v)
}
for (const m of aboveIdsSrc.matchAll(/(?<![\w.])(\d{3,4})(?![\w.])/g)) {
  gidNums.push(Number(m[1]))
}
const ABOVE_GIDS = new Set(gidNums)

const isWalkableGid = (gid) => {
  // walkableTileIds.ts holds GIDs that never collide regardless of layer.
  if (!walkableGids) return false
  return walkableGids.has(gid)
}
let walkableGids = null
try {
  const wtSrc = fs.readFileSync(
    new URL('../src/game/map/walkableTileIds.ts', import.meta.url),
    'utf8'
  )
  const arrStart = wtSrc.indexOf('[')
  const arrEnd = wtSrc.indexOf(']', arrStart)
  walkableGids = new Set(
    [...wtSrc.slice(arrStart, arrEnd).matchAll(/\d+/g)].map((m) => Number(m[0]))
  )
} catch {
  walkableGids = null
}

// ---- Compute solid/overlay maps BEFORE and AFTER -------------------------
const compute = (applyNewRules) => {
  const solid = new Set()
  const overlay = new Set()
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const gid = gidOf(x, y)
      if (gid === 0) continue
      const c = `${x},${y}`
      const dup =
        (applyNewRules
          ? (ABOVE_GIDS.has(gid) || pillar.has(c)) && !forceSolid.has(c)
          : ABOVE_GIDS.has(gid) || pillar.has(c))
      if (dup) overlay.add(c)
      const open =
        (applyNewRules
          ? isWalkableGid(gid) ||
          (ABOVE_GIDS.has(gid) || pillar.has(c)) && !forceSolid.has(c) ||
          walkBehind.has(c) && !forceSolid.has(c)
          : isWalkableGid(gid) || ABOVE_GIDS.has(gid) || pillar.has(c))
      if (!open) solid.add(c)
    }
  }
  // west house cells (baseline for both states)
  for (const c of westOpen) {
    if (solid.has(c)) solid.delete(c)
  }
  for (const c of westForeground) {
    if (solid.has(c)) overlay.add(c)
  }
  {
    for (const c of walkBehind) {
      if (!applyNewRules || !forceSolid.has(c)) {
        solid.delete(c)
        overlay.add(c)
      }
    }
    if (applyNewRules) {
      for (const c of forceSolid) {
        solid.add(c)
        overlay.delete(c)
      }
    }
  }
  return { solid, overlay }
}

const before = compute(false)
const after = compute(true)

// ---- Regions -------------------------------------------------------------
const A = [] // left thatched roof walk-behind
for (let x = 6; x <= 9; x += 1) for (let y = 5; y <= 7; y += 1) A.push(`${x},${y}`)
const B = []
for (let x = 14; x <= 17; x += 1) for (let y = 8; y <= 10; y += 1) B.push(`${x},${y}`)
const C = []
for (let x = 0; x <= 3; x += 1) for (let y = 10; y <= 11; y += 1) C.push(`${x},${y}`)
const D = ['19,8', '20,8', '21,8', '22,8', '19,9', '19,10']

// ---- VERIFY 1: tile IDs in A-D ------------------------------------------
console.log('=== VERIFY 1: tile IDs in A-D ===')
const report = (name, cells) => {
  console.log(`\n${name}:`)
  for (const c of cells) {
    console.log(`  ${c}: gid=${gidOf(...c.split(',').map(Number))}`)
  }
}
report('A left thatched roof (6-9, 5-7)', A)
report('B right thatched walls (14-17, 8-10)', B)
report('C dojo walls (0-3, 10-11)', C)
report('D garden props', D)

// ---- VERIFY 2: (12,8) -----------------------------------------------------
console.log('\n=== VERIFY 2: cell (12,8) ===')
console.log(`  gid=${gidOf(12, 8)}`)
console.log(`  solid=${after.solid.has('12,8')}`)
console.log(`  blocks path between (11,8) and statue: ${after.solid.has('12,8') ? 'yes' : 'no'}`)

// ---- VERIFY 3: walk-behind cells left in cols 0-25, rows 0-13 ------------
console.log('\n=== VERIFY 3: walk-behind cells in cols 0-25, rows 0-13 (after) ===')
const wbInRegion = [...after.overlay].filter((c) => {
  const [x, y] = c.split(',').map(Number)
  return x <= 25 && y <= 13 && gidOf(x, y) !== 0
})
console.log(wbInRegion.sort().join(' ') || '(none)')

// ---- ASCII grids ----------------------------------------------------------
const char = (state, x, y) => {
  const c = `${x},${y}`
  if (state.overlay.has(c) && state.solid.has(c)) return 'X'
  if (state.overlay.has(c)) return 'B'
  if (state.solid.has(c)) return '#'
  return gidOf(x, y) !== 0 ? 'o' : '.'
}
const grid = (name, state) => {
  console.log(`\n=== ${name} (cols 0-25, rows 0-13) ===`)
  console.log('     ' + Array.from({ length: 26 }, (_, i) => String(i).padStart(2)).join(' '))
  for (let y = 0; y <= 13; y += 1) {
    let row = `${String(y).padStart(4)} `
    for (let x = 0; x <= 25; x += 1) row += char(state, x, y) + ' '
    console.log(row)
  }
}
grid('BEFORE', before)
grid('AFTER', after)

// ---- Reachability of the sand road ---------------------------------------
console.log('\n=== ROAD: (0,6) -> (18,6) ===')
const seen = new Set(['0,6'])
const queue = ['0,6']
while (queue.length) {
  const cur = queue.shift()
  const [cx, cy] = cur.split(',').map(Number)
  for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {
    if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) continue
    const nc = `${nx},${ny}`
    if (seen.has(nc) || after.solid.has(nc)) continue
    seen.add(nc)
    queue.push(nc)
  }
}
console.log(`  road cells reachable: ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].every((x) => seen.has(`${x},6`) && seen.has(`${x},7`))}`)
if (![0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].every((x) => seen.has(`${x},6`))) {
  for (let x = 0; x <= 18; x += 1) {
    if (!seen.has(`${x},6`)) console.log(`  BLOCKED: (${x},6) gid=${gidOf(x, 6)}`)
    if (!seen.has(`${x},7`)) console.log(`  BLOCKED: (${x},7) gid=${gidOf(x, 7)}`)
  }
}

// ---- Assertions -----------------------------------------------------------
let failed = 0
const assert = (cond, msg) => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${msg}`)
  if (!cond) failed += 1
}
console.log('\n=== ASSERTIONS ===')
// only listed cells changed
const changed = []
for (let y = 0; y < map.height; y += 1) {
  for (let x = 0; x < map.width; x += 1) {
    const c = `${x},${y}`
    const sb = before.solid.has(c)
    const sa = after.solid.has(c)
    const ob = before.overlay.has(c)
    const oa = after.overlay.has(c)
    if (sb !== sa || ob !== oa) changed.push(c)
  }
}
const allListed = new Set([...A, ...B, ...C, ...D])
assert(
  changed.every((c) => allListed.has(c)) && changed.length > 0,
  `only listed cells changed (${changed.length} cells; outside: ${changed.filter((c) => !allListed.has(c)).join(', ') || 'none'})`
)
// lower half unchanged (rows 14+)
const lowerChanged = changed.filter((c) => Number(c.split(',')[1]) >= 14)
assert(lowerChanged.length === 0, `lower half (rows 14+) unchanged: ${lowerChanged.join(', ') || 'ok'}`)
// A roofs walk-behind; rows 8-11 solid
assert(A.every((c) => !after.solid.has(c) && after.overlay.has(c)), 'A: roof cells 6-9,5-7 walk-behind')
assert([6, 7, 8, 9].every((x) => [8, 9, 10, 11].every((y) => after.solid.has(`${x},${y}`))), 'A: rows 8-11 stay solid')
// B walls solid, no overlay
assert(B.every((c) => after.solid.has(c) && !after.overlay.has(c)), 'B: walls 14-17,8-10 solid, no overlay')
assert([14, 15, 16, 17].every((x) => [5, 6, 7].every((y) => !after.solid.has(`${x},${y}`) && after.overlay.has(`${x},${y}`))), 'B: roof rows 5-7 walk-behind')
assert([14, 15, 16, 17].every((x) => after.solid.has(`${x},11`)), 'B: row 11 solid')
// C dojo solid, no overlay
assert(C.every((c) => after.solid.has(c) && !after.overlay.has(c)), 'C: dojo 0-3,10-11 solid, no overlay')
assert([0, 1, 2, 3].every((x) => [7, 8, 9].every((y) => !after.solid.has(`${x},${y}`) && after.overlay.has(`${x},${y}`))), 'C: dojo roof rows 7-9 walk-behind')
// D props solid, no overlay; shop roof walk-behind; base row solid
assert(D.every((c) => after.solid.has(c) && !after.overlay.has(c)), 'D: props solid, no overlay')
assert([20, 21, 22].every((x) => [9, 10].every((y) => !after.solid.has(`${x},${y}`) && after.overlay.has(`${x},${y}`))), 'D: shop roof 20-22,9-10 walk-behind')
assert([20, 21, 22].every((x) => after.solid.has(`${x},11`)), 'D: shop base row 11 solid')
// top-row houses: roofs walk-behind, wall row 4 solid
const topDoors = ['1,4', '5,4', '9,4', '13,4']
assert(topDoors.every((c) => after.solid.has(c) && !after.overlay.has(c)), `top-row house doors ${topDoors} solid`)
assert([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].every((x) => [2, 3].every((y) => gidOf(x, y) !== 0 ? !after.solid.has(`${x},${y}`) && after.overlay.has(`${x},${y}`) : true)), 'top-row house roofs rows 2-3 walk-behind (where art exists)')
// walk-behind never overlaps force-solid
assert([...forceSolid].every((c) => !walkBehind.has(c)), 'no cell in both walk-behind and force-solid sets')
// road reachable
assert([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].every((x) => seen.has(`${x},6`)), 'road (0,6)->(18,6) reachable')

// hashes
const hashOf = (s, o) =>
  createHash('sha256')
    .update([...s].sort().join('|') + '##' + [...o].sort().join('|'))
    .digest('hex')
    .slice(0, 12)
const hashLower = (state) => {
  const lower = { solid: new Set(), overlay: new Set() }
  for (const c of state.solid) if (Number(c.split(',')[1]) >= 14) lower.solid.add(c)
  for (const c of state.overlay) if (Number(c.split(',')[1]) >= 14) lower.overlay.add(c)
  return hashOf(lower.solid, lower.overlay)
}
console.log(`\nhashes: full before=${hashOf(before.solid, before.overlay)} after=${hashOf(after.solid, after.overlay)} | lower half before=${hashLower(before)} after=${hashLower(after)}`)

console.log(`\n${failed === 0 ? 'ALL CHECKS PASSED' : failed + ' CHECK(S) FAILED'}`)
process.exit(failed === 0 ? 0 : 1)
