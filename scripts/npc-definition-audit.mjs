#!/usr/bin/env node
/**
 * READ-ONLY NPC definition audit for the world-wide NPC review.
 * Parses villageNpcs.ts and worldNpcs.ts with a stricter block-based parser
 * (one NPC object per `id:` line, bounded by the object braces) and reports
 * counts, asset usage, positions, and pairwise spacing violations.
 */
import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function parseNpcFile(url) {
  const src = fs.readFileSync(new URL(url, import.meta.url), 'utf8')
  const npcs = []
  // Split on top-level "  {\n    id: '...'" object starts inside the array.
  const idPattern = /id: '([a-z-]+)'/g
  const positions = []
  let m
  while ((m = idPattern.exec(src)) !== null) positions.push({ id: m[1], index: m.index })
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].index
    const end = i + 1 < positions.length ? positions[i + 1].index : src.length
    const block = src.slice(start, end)
    const tileX = block.match(/tileX: (\d+)/)
    const tileY = block.match(/tileY: (\d+)/)
    const portrait = block.match(/portraitUrl: (\w+)/)
    const spriteKey = block.match(/spriteKey: '([^']+)'/)
    const characterAsset = block.match(/characterAsset: '([^']+)'/)
    npcs.push({
      id: positions[i].id,
      tileX: tileX ? Number(tileX[1]) : null,
      tileY: tileY ? Number(tileY[1]) : null,
      portrait: portrait ? portrait[1] : null,
      spriteKey: spriteKey ? spriteKey[1] : null,
      characterAsset: characterAsset ? characterAsset[1] : null,
    })
  }
  return npcs
}

const village = parseNpcFile('../src/game/npc/villageNpcs.ts')
const world = parseNpcFile('../src/game/npc/worldNpcs.ts')
console.log(`village NPCs: ${village.length}, world NPCs: ${world.length}, total: ${village.length + world.length}`)

const all = [...village, ...world]
const portraitCounts = {}
for (const npc of all) portraitCounts[npc.portrait] = (portraitCounts[npc.portrait] || 0) + 1
for (const [p, n] of Object.entries(portraitCounts)) if (n > 1) console.log(`DUP portrait ${p} x${n}`)
const assetCounts = {}
for (const npc of all) assetCounts[npc.characterAsset] = (assetCounts[npc.characterAsset] || 0) + 1
for (const [asset, n] of Object.entries(assetCounts)) if (n > 1) console.log(`DUP characterAsset ${asset} x${n}`)
console.log(`unique character assets: ${Object.keys(assetCounts).length}/${all.length}`)

console.log('\n--- pairwise spacing (< 4 Manhattan tiles) ---')
for (let i = 0; i < all.length; i++) {
  for (let j = i + 1; j < all.length; j++) {
    const a = all[i], b = all[j]
    const dist = Math.abs(a.tileX - b.tileX) + Math.abs(a.tileY - b.tileY)
    if (dist < 4) console.log(`CLOSE ${a.id} (${a.tileX},${a.tileY}) <-> ${b.id} (${b.tileX},${b.tileY}): ${dist}`)
  }
}
console.log('\n--- all positions ---')
for (const npc of all) console.log(`${npc.id} (${npc.tileX},${npc.tileY}) ${npc.portrait}`)
