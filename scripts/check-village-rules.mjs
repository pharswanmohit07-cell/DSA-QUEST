#!/usr/bin/env node
/**
 * Verifies west-yard doors, arch posts and statue-path pillars without touching
 * MAP.json/art. Run with: node scripts/check-village-rules.mjs
 *
 * Glyphs: # solid, B non-solid walk-behind, X solid + overlay,
 * o walkable obstacle-layer art, . empty.
 */
import fs from 'node:fs'
import { createHash } from 'node:crypto'

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8')
const map = JSON.parse(read('../src/assets/tiles/ninja-village/MAP.json'))
const sceneSrc = read('../src/game/scenes/MainScene.ts')
const rulesSrc = read('../src/game/map/villageRegionRules.ts')
const walkSrc = read('../src/game/map/walkableTileIds.ts')
const aboveSrc = read('../src/game/map/abovePlayerTileIds.ts')

const layer = (name) => {
  const found = map.layers.find((item) => item.name === name)
  if (!found || !Array.isArray(found.data)) throw new Error('Missing tile layer: ' + name)
  return found
}
const obstacleLayer = layer('1_Obstacles')
const groundLayer = layer('0_Ground')
const aboveLayer = layer('2_AbovePlayer')
const gidAt = (tileLayer, x, y) => tileLayer.data[y * map.width + x] || 0
const coord = (x, y) => x + ',' + y

const extractSet = (source, name) => {
  const match = source.match(new RegExp('(?:const|export const)\\s+' + name + '[^=]*=\\s*new Set(?:<[^>]+>)?\\(\\s*\\[([\\s\\S]*?)\\]\\s*\\)'))
  if (!match) throw new Error('Could not extract set ' + name)
  return new Set([...match[1].matchAll(/['"](\d+,\d+)['"]/g)].map((item) => item[1]))
}

const rulesJs = rulesSrc.replace(/: string\[\]/g, '')
const rulesModule = await import('data:text/javascript;base64,' + Buffer.from(rulesJs).toString('base64'))
const walkBehindAfter = rulesModule.VILLAGE_WALK_BEHIND_CELLS
const fenceOverlay = rulesModule.VILLAGE_FENCE_OVERLAY_CELLS

const walkJs = walkSrc
  .slice(0, walkSrc.indexOf('/**\n * Named groups'))
  .replace(/:\s*readonly number\[\]/g, '')
  .replace(/:\s*number\[\]/g, '')
  .replace(/:\s*ReadonlySet<number>/g, '')
const walkModule = await import('data:text/javascript;base64,' + Buffer.from(walkJs).toString('base64'))
const walkableGids = walkModule.WALKABLE_TILE_IDS

const aboveJs = aboveSrc
  .slice(0, aboveSrc.indexOf('/** Named groups'))
  .replace(/:\s*readonly number\[\]/g, '')
  .replace(/:\s*number\[\]/g, '')
  .replace(/:\s*ReadonlySet<number>/g, '')
  .replace(/:\s*number\b/g, '')
const aboveModule = await import('data:text/javascript;base64,' + Buffer.from(aboveJs).toString('base64'))
const nonSolidOverhangGids = aboveModule.NON_SOLID_OVERHANG_TILE_IDS
const abovePlayerGids = aboveModule.ABOVE_PLAYER_TILE_IDS
const woodenWallGids = new Set([1542, 1543, 1544, 1575, 1576, 1577])
const woodenWallTopGids = new Set([1542, 1543, 1544])
const lakeGids = new Set([68, 124])

const readInlineCoords = (source, name) => {
  const startMarker = 'const ' + name + ' = new Set(['
  const start = source.indexOf(startMarker)
  if (start < 0) throw new Error('Could not locate coordinate set ' + name)
  const end = source.indexOf('])', start)
  if (end < 0) throw new Error('Unterminated coordinate set ' + name)
  return new Set([...source.slice(start, end + 2).matchAll(/['"](\d+,\d+)['"]/g)].map((item) => item[1]))
}

const inlinePillars = readInlineCoords(sceneSrc, 'VILLAGE_PILLAR_OVERHANGS')
const openAfter = extractSet(sceneSrc, 'WEST_HOUSE_OPEN_CELLS')
const foregroundAfter = extractSet(sceneSrc, 'WEST_HOUSE_FOREGROUND_CELLS')

// Reconstruct the exact previous west-yard / pillar rules for a before/after diff.
const openBefore = new Set(['1,17', '7,17', '1,18', '7,18', '1,19', '7,19'])
const foregroundBefore = new Set(foregroundAfter)
foregroundBefore.add('1,17')
foregroundBefore.add('7,17')
const walkBehindBefore = new Set(walkBehindAfter)
walkBehindBefore.delete('10,13')
walkBehindBefore.delete('13,13')

const buildState = ({ openCells, foregroundCells, walkBehindCells }) => {
  const solid = new Set()
  const overlay = new Set()
  const pillarCells = new Set([...inlinePillars, ...walkBehindCells])

  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const cell = coord(x, y)
      const obstacleGid = gidAt(obstacleLayer, x, y)
      const groundGid = gidAt(groundLayer, x, y)

      let obstacleSolid = obstacleGid !== 0 &&
        !walkableGids.has(obstacleGid) &&
        !nonSolidOverhangGids.has(obstacleGid) &&
        !pillarCells.has(cell)

      // Existing quest gate lock: kept identical before and after.
      if (obstacleGid !== 0 && x >= 11 && x <= 13 && y >= 20 && y <= 24) {
        obstacleSolid = true
      }

      // Runtime order: applyGateLock() first, then west-yard rules.
      if (obstacleGid !== 0 && x >= 0 && x <= 9 && y >= 14 && y <= 19) {
        obstacleSolid = !openCells.has(cell)
      }

      const groundSolid = lakeGids.has(groundGid) || woodenWallGids.has(groundGid)
      if (obstacleSolid || groundSolid) solid.add(cell)

      const authoredOverlay = gidAt(aboveLayer, x, y) !== 0
      const generatedOverlay = obstacleGid !== 0 && (
        abovePlayerGids.has(obstacleGid) ||
        pillarCells.has(cell) ||
        fenceOverlay.has(cell) ||
        foregroundCells.has(cell)
      )
      if (authoredOverlay || generatedOverlay || woodenWallTopGids.has(groundGid)) {
        overlay.add(cell)
      }
    }
  }
  return { solid, overlay }
}

const before = buildState({ openCells: openBefore, foregroundCells: foregroundBefore, walkBehindCells: walkBehindBefore })
const after = buildState({ openCells: openAfter, foregroundCells: foregroundAfter, walkBehindCells: walkBehindAfter })

const charOf = (state, x, y) => {
  const cell = coord(x, y)
  const isSolid = state.solid.has(cell)
  const hasOverlay = state.overlay.has(cell)
  if (isSolid && hasOverlay) return 'X'
  if (isSolid) return '#'
  if (hasOverlay) return 'B'
  return gidAt(obstacleLayer, x, y) !== 0 ? 'o' : '.'
}
const printGrid = (state, label, x0, x1, y0, y1) => {
  console.log('\n=== ' + label + ' x' + x0 + '-' + x1 + ', y' + y0 + '-' + y1 + ' ===')
  console.log('     ' + Array.from({ length: x1 - x0 + 1 }, (_, i) => String(x0 + i).padStart(2)).join(' '))
  for (let y = y0; y <= y1; y += 1) {
    console.log(String(y).padStart(4) + ' ' + Array.from(
      { length: x1 - x0 + 1 }, (_, i) => charOf(state, x0 + i, y),
    ).join(' '))
  }
}

printGrid(before, 'BEFORE west yard', 0, 10, 12, 19)
printGrid(after, 'AFTER west yard', 0, 10, 12, 19)
printGrid(before, 'BEFORE path pillars', 9, 14, 11, 16)
printGrid(after, 'AFTER path pillars', 9, 14, 11, 16)

let failures = 0
const assert = (condition, message) => {
  console.log('  ' + (condition ? 'PASS ' : 'FAIL ') + message)
  if (!condition) failures += 1
}

// Tile-art guard: these GIDs must not be reused by any other cell/layer.
const gidUses = new Map([[1692, []], [1725, []]])
for (const tileLayer of map.layers) {
  if (!Array.isArray(tileLayer.data)) continue
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const gid = gidAt(tileLayer, x, y)
      if (gidUses.has(gid)) gidUses.get(gid).push(tileLayer.name + ':' + coord(x, y))
    }
  }
}
console.log('\nPillar art GID usage:')
console.log('  GID 1692: ' + gidUses.get(1692).join(', '))
console.log('  GID 1725: ' + gidUses.get(1725).join(', '))
assert(JSON.stringify(gidUses.get(1692).sort()) === JSON.stringify(['1_Obstacles:10,13', '1_Obstacles:13,13'].sort()), 'GID 1692 is used only by the two requested pillar tops')
assert(JSON.stringify(gidUses.get(1725).sort()) === JSON.stringify(['1_Obstacles:10,14', '1_Obstacles:13,14'].sort()), 'GID 1725 is used only by the two requested pillar bases')

// Required local grid rows.
const rowText = (state, x0, x1, y) => Array.from({ length: x1 - x0 + 1 }, (_, i) => charOf(state, x0 + i, y)).join(' ')
assert(rowText(after, 0, 10, 17) === '# # # . . # # # # X .', 'expected after-grid row 17')
assert(rowText(after, 0, 10, 18) === 'o B o . . . o B o X #', 'expected after-grid row 18')
assert(['10,13', '13,13'].every((c) => !after.solid.has(c) && after.overlay.has(c)), 'pillar tops (10,13) and (13,13) are walk-behind')
assert(['10,14', '13,14'].every((c) => after.solid.has(c)), 'pillar bases (10,14) and (13,14) remain solid')
assert(Array.from({ length: 9 }, (_, x) => x).every((x) => !after.solid.has(coord(x, 18))), 'lawn row 18 is walkable across columns 0-8')
assert(['1,17', '7,17'].every((c) => after.solid.has(c) && !after.overlay.has(c)), 'both house doors are solid with no overlay')
assert(['1,18', '7,18', '1,19', '7,19'].every((c) => !after.solid.has(c)), 'both arch tops and both gate openings remain walkable')
assert(['0,19', '2,19', '3,19', '4,19', '5,19', '6,19', '8,19'].every((c) => after.solid.has(c)), 'fence row 19 remains solid beside both gates')

// Full-map diff: exactly the requested eight coordinates may change.
const expectedChangedCells = new Set([
  '1,17', '7,17',
  '0,18', '2,18', '6,18', '8,18',
  '10,13', '13,13',
])
const changedCells = new Set()
const unexpectedChanges = []
for (let y = 0; y < map.height; y += 1) {
  for (let x = 0; x < map.width; x += 1) {
    const cell = coord(x, y)
    const solidChanged = before.solid.has(cell) !== after.solid.has(cell)
    const overlayChanged = before.overlay.has(cell) !== after.overlay.has(cell)
    if (solidChanged || overlayChanged) changedCells.add(cell)
    if ((solidChanged || overlayChanged) && !expectedChangedCells.has(cell)) {
      unexpectedChanges.push(cell + (solidChanged ? ' solid' : '') + (overlayChanged ? ' overlay' : ''))
    }
  }
}
assert(unexpectedChanges.length === 0, 'no solid/overlay changes outside the eight requested cells' +
  (unexpectedChanges.length ? ': ' + unexpectedChanges.join(', ') : ''))
assert([...expectedChangedCells].every((cell) => changedCells.has(cell)) && changedCells.size === expectedChangedCells.size,
  'full-map state diff matches exactly the eight requested coordinates')

const hashState = (state) => createHash('sha256')
  .update([...state.solid].sort().join('|') + '##' + [...state.overlay].sort().join('|'))
  .digest('hex')
console.log('\nFull-map solid/overlay SHA-256:')
console.log('  before: ' + hashState(before))
console.log('  after:  ' + hashState(after))
console.log('  changed coordinates: ' + [...changedCells].sort().join(', '))

// Reachability from the path south of the fence, using all walkable map cells.
const bfs = (state, start, restrictToWestYard = false) => {
  const reachable = new Set([start])
  const parent = new Map()
  const queue = [start]
  if (state.solid.has(start)) return { reachable: new Set(), parent }
  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head]
    const [x, y] = current.split(',').map(Number)
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue
      if (restrictToWestYard && (nx < 0 || nx > 10 || ny < 14 || ny > 20)) continue
      const next = coord(nx, ny)
      if (reachable.has(next) || state.solid.has(next)) continue
      reachable.add(next)
      parent.set(next, current)
      queue.push(next)
    }
  }
  return { reachable, parent }
}
const reconstructPath = (parent, end) => {
  const path = [end]
  let current = end
  while (parent.has(current)) {
    current = parent.get(current)
    path.push(current)
  }
  return path.reverse()
}
const pathStart = '4,20'
const globalReach = bfs(after, pathStart)
assert(globalReach.reachable.has('1,19') && globalReach.reachable.has('7,19'),
  'both arch gates are reachable from path south of the fence')
assert(!globalReach.reachable.has('1,16') && !globalReach.reachable.has('7,16'),
  'the path cannot reach either house interior')
const localReach = bfs(after, pathStart, true)
assert(![...localReach.reachable].some((cell) => Number(cell.split(',')[1]) <= 13),
  'the lawn cannot cross the back fence directly into rows 13 and above within the west-yard boundary')

const northCell = [...globalReach.reachable]
  .filter((cell) => Number(cell.split(',')[1]) <= 13)
  .sort((a, b) => Number(b.split(',')[1]) - Number(a.split(',')[1]))[0]
if (northCell) {
  const path = reconstructPath(globalReach.parent, northCell)
  console.log('\nExisting global bypass to north side (diagnostic): ' + path.join(' -> '))
}
assert(!northCell, 'the lawn cannot reach any north-side cell (row 13 or above) anywhere on the map')

// Preserve unrelated east rocks / compound / dojo rules.
assert(['26,20', '27,20', '29,12', '30,12', '29,13', '30,13', '32,15', '33,15', '32,18', '33,18', '34,18', '31,19', '32,19', '33,19', '34,19', '21,19', '23,19', '24,19']
  .every((cell) => walkBehindAfter.has(cell)), 'existing east-rock and dojo walk-behind rules remain present')
assert(fenceOverlay.has('14,14') && fenceOverlay.has('23,17') && !fenceOverlay.has('16,18') && !fenceOverlay.has('21,18'),
  'existing compound perimeter and its two doors remain unchanged')

console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'))
process.exit(failures === 0 ? 0 : 1)
