#!/usr/bin/env node
/**
 * List cells near the player (columns 16-26, rows 8-13) that are drawn over the
 * player (duplicated onto the above-player layer), with their GIDs.
 */
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const map = require('../src/assets/tiles/ninja-village/MAP.json')

// Re-derive the GID lists from abovePlayerTileIds.ts by importing via tsx is
// awkward in plain node, so duplicate the ranges here (kept in sync manually).
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i)
const ROOF_TOP = [...range(1124, 1139), ...range(1157, 1172), ...range(1239, 1241), ...range(1285, 1287), ...range(1318, 1320), ...range(1487, 1495)]
const CANOPY = [...range(1884, 1890), ...range(1897, 1898), ...range(1901, 1902), ...range(1935, 1938), ...range(1947, 1950), ...range(1959, 1962), ...range(2011, 2014), ...range(2035, 2038), 2081, 2086, ...range(2321, 2323), ...range(2345, 2347), 2369, 2371, ...range(2315, 2317), ...range(2339, 2341), 2363, 2365]
const BOULDER = [...range(2091, 2092), ...range(2140, 2142), ...range(2144, 2145), ...range(2164, 2169), ...range(2234, 2239), ...range(2258, 2263)]
const STONE = [...range(1813, 1815), ...range(1822, 1823), ...range(1846, 1848)]
const PILLAR_TOP = [1619, 1652, 1688, 1689]
const ALL = new Set([...ROOF_TOP, ...CANOPY, ...BOULDER, ...STONE, ...PILLAR_TOP])

const obs = map.layers.find((l) => l.name === '1_Obstacles').data
const fg = map.layers.find((l) => l.name === '2_AbovePlayer')?.data

const obstacles = map.layers.find((l) => l.name === 'collision').objects
const TS = 32
const solidCells = new Set()
for (const o of obstacles) {
  for (let yy = Math.floor(o.y / TS); yy < (o.y + o.height) / TS; yy += 1) {
    for (let xx = Math.floor(o.x / TS); xx < (o.x + o.width) / TS; xx += 1) {
      solidCells.add(`${xx},${yy}`)
    }
  }
}

for (let y = 8; y <= 13; y += 1) {
  const row = []
  for (let x = 16; x <= 26; x += 1) {
    if (solidCells.has(`${x},${y}`)) row.push(`(${x},${y})=SOLID`)
    const g = obs[y * map.width + x]
    if (g !== 0 && (ALL.has(g) || (fg && fg[y * map.width + x] !== 0))) {
      row.push(`(${x},${y})=${g}${ALL.has(g) ? ' aboveSet' : ''}${fg && fg[y * map.width + x] !== 0 ? ' fg' : ''}`)
    }
  }
  if (row.length) console.log(`row ${y}: ${row.join(' ')}`)
}
