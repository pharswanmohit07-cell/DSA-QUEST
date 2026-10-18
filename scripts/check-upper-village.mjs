#!/usr/bin/env node
/**
 * Verifies the upper-village collision-object region.
 * Runtime collision is clipped to rows 0-11; rows 12 onward are out of scope.
 * Run with: node scripts/check-upper-village.mjs
 */
import fs from 'node:fs'

const read = (relativePath) => fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8')
const map = JSON.parse(read('../src/assets/tiles/ninja-village/MAP.json'))
const scene = read('../src/game/scenes/MainScene.ts')
const collisionLayer = map.layers.find((layer) => layer.name === 'collision')
if (!collisionLayer?.objects) throw new Error('MAP.json is missing the collision object layer')

const maxRow = 12
const maxY = maxRow * map.tileheight
const coord = (x, y) => `${x},${y}`
const rawCoverage = new Set()
const exceptions = new Set([
  '1,9', '2,9', '1,10', '2,10', '1,11', '2,11',
  '10,8', '13,8', '18,8', '18,9', '18,10',
])

for (const object of collisionLayer.objects) {
  const left = Math.max(0, object.x)
  const top = Math.max(0, object.y)
  const right = Math.min(map.width * map.tilewidth, object.x + object.width)
  const bottom = Math.min(maxY, object.y + object.height)
  if (right <= left || bottom <= top) continue

  for (let y = Math.max(0, Math.floor(top / map.tileheight)); y < Math.min(maxRow, Math.ceil(bottom / map.tileheight)); y += 1) {
    for (let x = Math.max(0, Math.floor(left / map.tilewidth)); x < Math.min(map.width, Math.ceil(right / map.tilewidth)); x += 1) {
      rawCoverage.add(coord(x, y))
    }
  }
}
const coverage = new Set([...rawCoverage].filter((cell) => !exceptions.has(cell)))

let failures = 0
const assert = (condition, message) => {
  console.log(`  ${condition ? 'PASS' : 'FAIL'} ${message}`)
  if (!condition) failures += 1
}

const houseCells = [
  ...[7, 8, 9, 10, 11].flatMap((y) => [coord(0, y), coord(3, y)]),
  ...[6, 7, 8, 9, 10, 11].flatMap((y) => [coord(6, y), coord(7, y), coord(8, y), coord(9, y)]),
  ...[5, 6, 7, 8, 9, 10, 11].flatMap((y) => [coord(14, y), coord(15, y), coord(16, y), coord(17, y)]),
  ...[8, 9, 10, 11].flatMap((y) => [coord(19, y), coord(20, y), coord(21, y), coord(22, y)]),
]
assert(houseCells.every((cell) => coverage.has(cell)), 'upper house and facade footprints are blocked')
assert(Array.from({ length: 9 }, (_, i) => coord(26 + i, 0)).every((cell) => coverage.has(cell)), 'top-boundary fence row is blocked')
assert(Array.from({ length: 9 }, (_, i) => coord(26 + i, 1)).every((cell) => coverage.has(cell)), 'second top-boundary fence row is blocked')
assert(['1,9', '2,9', '1,10', '2,10', '1,11', '2,11'].every((cell) => !coverage.has(cell)), 'west-gate passage remains open')
assert(['10,8', '13,8', '18,8', '18,9', '18,10'].every((cell) => !coverage.has(cell)), 'upper path-side props retain walk-behind behavior')
assert(['26,9', '27,9', '28,9'].every((cell) => !coverage.has(cell)), 'right-side entry gap defined by the map remains open')
assert(['26,6', '30,6'].every((cell) => coverage.has(cell)), 'upper-right fence/structure blocks reused walkable-track GIDs')
assert([...coverage].every((cell) => Number(cell.split(',')[1]) < maxRow), 'collision coverage does not reach row 12 or below')
assert(scene.includes('UPPER_VILLAGE_COLLISION_MAX_ROW = 12'), 'runtime clips this feature to upper rows 0-11')
assert(scene.includes('this.applyUpperVillageCollisionRules(mapJson, mapTileWidth, mapTileHeight)'), 'runtime consumes the authored collision layer')
assert(scene.includes('this.addUpperVillageGapColliders(mapTileWidth, mapTileHeight)'), 'blank cells inside upper collision objects receive blockers')
assert(scene.includes('this.upperVillageCollisionCells.has(`${tileX},${tileY}`)'), 'Layer Preview displays invisible upper blockers as red')

console.log(`\nUpper collision coverage: ${coverage.size} cells across rows 0-${maxRow - 1}`)
console.log('\nASCII collision grid (# blocked, G west gate, P walk-behind prop, . open)')
for (let y = 0; y < maxRow; y += 1) {
  let row = ''
  for (let x = 0; x < map.width; x += 1) {
    const cell = coord(x, y)
    row += coverage.has(cell) ? '#' : (exceptions.has(cell) ? (cell.startsWith('10,') || cell.startsWith('13,') || cell.startsWith('18,') ? 'P' : 'G') : '.')
  }
  console.log(String(y).padStart(2) + ' ' + row)
}
console.log(`\n${failures === 0 ? 'ALL UPPER-VILLAGE CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`)
process.exit(failures === 0 ? 0 : 1)
