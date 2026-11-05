#!/usr/bin/env node
/** Dev-only verification for the upper-village roof regions (cols 0-25, rows 0-13). */
import fs from 'node:fs'
const map = JSON.parse(fs.readFileSync(new URL('../src/assets/tiles/ninja-village/MAP.json', import.meta.url), 'utf8'))
const gidOf = (x, y) => map.layers.find((l) => l.name === '1_Obstacles').data[y * map.width + x]
for (let y = 0; y <= 13; y += 1) {
  const cells = []
  for (let x = 0; x <= 25; x += 1) {
    cells.push(`${x},${y}:${gidOf(x, y)}`)
  }
  console.log(`row ${String(y).padStart(2)}: ${cells.join(' ')}`)
}
