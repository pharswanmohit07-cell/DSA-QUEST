#!/usr/bin/env node
/**
 * Dev-only asset edit: turns the two compound house gates red and clears the
 * inner-yard debris tiles.
 *
 *   node scripts/make-red-gates.mjs
 *
 * What it does:
 *  1. Decodes `TilesetHouse.png`, finds two fully-empty tile slots, and copies
 *     the blue gate tiles (GIDs 1643 and 1776) into them with every blue pixel
 *     remapped to the matching red hue (luminance preserved).
 *  2. Re-encodes the tileset PNG in place.
 *  3. Updates `MAP.json`:
 *     - obstacle cell (16,17) -> red variant of 1643
 *     - obstacle cell (21,17) -> red variant of 1776
 *     - obstacle cells (18,15), (19,15), (18,16), (19,16), (19,17) cleared to 0
 *
 * Only the two compound cells are repointed; every other use of GIDs 1643/1776
 * (west house, east house) keeps the original blue art.
 */
import fs from 'node:fs'
import zlib from 'node:zlib'

const HOUSE_PNG = 'src/assets/tiles/ninja-village/TilesetHouse.png'
const MAP_JSON = 'src/assets/tiles/ninja-village/MAP.json'
const HOUSE_FIRSTGID = 1124
const TILE = 16

// --- minimal PNG decode (RGBA / RGB, non-interlaced) ------------------------
function readPNG(path) {
  const buf = fs.readFileSync(path)
  let pos = 8
  let w = 0, h = 0, colorType = 0, depth = 0
  const idat = []
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('ascii', pos + 4, pos + 8)
    if (type === 'IHDR') {
      w = buf.readUInt32BE(pos + 8)
      h = buf.readUInt32BE(pos + 12)
      depth = buf[pos + 16]
      colorType = buf[pos + 17]
    }
    if (type === 'IDAT') idat.push(buf.subarray(pos + 8, pos + 8 + len))
    pos += 12 + len
  }
  if (depth !== 8 || (colorType !== 6 && colorType !== 2)) {
    throw new Error(`Unsupported PNG: depth=${depth} colorType=${colorType}`)
  }
  const bpp = colorType === 6 ? 4 : 3
  const stride = w * bpp
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const rows = []
  let p = 0
  for (let y = 0; y < h; y += 1) {
    const filter = raw[p]
    p += 1
    const line = raw.subarray(p, p + stride)
    p += stride
    const prev = rows[y - 1] ?? Buffer.alloc(stride)
    const cur = Buffer.alloc(stride)
    for (let i = 0; i < stride; i += 1) {
      const a = i >= bpp ? cur[i - bpp] : 0
      const b = prev[i]
      const c = i >= bpp ? prev[i - bpp] : 0
      let v = line[i]
      if (filter === 1) v += a
      else if (filter === 2) v += b
      else if (filter === 3) v += (a + b) >> 1
      else if (filter === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      cur[i] = v & 255
    }
    rows.push(cur)
  }
  return { w, h, bpp, colorType, rows }
}

// --- minimal PNG encode (filter 0 rows, deflate) ----------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 255] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function writePNG(path, w, h, colorType, rows) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = colorType
  const raw = Buffer.concat(rows.flatMap((r) => [Buffer.from([0]), r]))
  fs.writeFileSync(path, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]))
}

// --- helpers ----------------------------------------------------------------
const tileOffset = (w, bpp, idx, cols) => ({
  x: (idx % cols) * TILE,
  y: Math.floor(idx / cols) * TILE,
})
function get(px, w, bpp, x, y) {
  const o = (y * w + x) * bpp
  return [px[o], px[o + 1], px[o + 2], bpp === 4 ? px[o + 3] : 255]
}
function set(px, w, bpp, x, y, [r, g, b, a]) {
  const o = (y * w + x) * bpp
  px[o] = r; px[o + 1] = g; px[o + 2] = b
  if (bpp === 4) px[o + 3] = a
}

/** Blue/teal pixel test: dark teal lattice (e.g. 20,27,27) or genuinely blue pixels. */
const isBlue = ([r, g, b]) => {
  if (r > 100) return false                 // wood/orange tones are never recolored
  if (b >= g && g > r + 4) return true      // teal: green+blue outrank red
  return b > r + 25 && b > g                // ordinary blue
}
/** Recolor one pixel keeping its luminance so shading survives. */
function blueToRed([r, g, b, a]) {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b
  // deep red ramp: lum 0 -> (60,8,8), lum 255 -> (255,120,110)
  const rr = Math.min(255, Math.round(60 + (lum / 255) * 195))
  const gg = Math.min(rr, Math.round(8 + (lum / 255) * 112))
  const bb = Math.min(gg, Math.round(8 + (lum / 255) * 102))
  return [rr, gg, bb, a]
}

// --- main -------------------------------------------------------------------
const map = JSON.parse(fs.readFileSync(MAP_JSON, 'utf8'))
const layerByName = Object.fromEntries(map.layers.map((l) => [l.name, l]))
const obstacles = layerByName['1_Obstacles'].data
const mapW = map.width
const flat = (arr) => (Array.isArray(arr[0]) ? arr.flat() : arr)
const obs = flat(obstacles)
const cellGid = (x, y) => obs[y * mapW + x]

const GATE_LEFT = { x: 16, y: 17, gid: 1643 }
const GATE_RIGHT = { x: 21, y: 17, gid: 1776 }
const DEBRIS_CELLS = [[18, 15], [19, 15], [18, 16], [19, 16], [19, 17]]

const currentLeft = cellGid(GATE_LEFT.x, GATE_LEFT.y)
const currentRight = cellGid(GATE_RIGHT.x, GATE_RIGHT.y)
if (currentLeft !== GATE_LEFT.gid && currentLeft !== 'RED') {
  throw new Error(`Unexpected GID ${currentLeft} at (${GATE_LEFT.x},${GATE_LEFT.y})`)
}
if (currentRight !== GATE_RIGHT.gid && currentRight !== 'RED') {
  throw new Error(`Unexpected GID ${currentRight} at (${GATE_RIGHT.x},${GATE_RIGHT.y})`)
}
const alreadyRed = currentLeft === 'RED' || currentRight === 'RED'

const { w, h, bpp, colorType, rows } = readPNG(HOUSE_PNG)
const px = Buffer.concat(rows)
const cols = Math.floor(w / TILE)
const rowsCount = Math.floor(h / TILE)
console.log(`TilesetHouse: ${w}x${h}, ${cols}x${rowsCount} tiles, ${bpp}bpp`)

// find empty slots (all pixels fully transparent)
const emptySlots = []
for (let idx = 0; idx < cols * rowsCount; idx += 1) {
  const { x, y } = tileOffset(w, bpp, idx, cols)
  let opaque = 0
  for (let ty = 0; ty < TILE; ty += 1) {
    for (let tx = 0; tx < TILE; tx += 1) {
      if (get(px, w, bpp, x + tx, y + ty)[3] > 0) opaque += 1
    }
  }
  if (opaque === 0) emptySlots.push(idx)
}
if (emptySlots.length < 2) throw new Error(`Need 2 empty slots, found ${emptySlots.length}`)
console.log(`Empty slots: ${emptySlots.slice(0, 6).map((i) => HOUSE_FIRSTGID + i).join(', ')} ...`)

// copy each gate tile into its own empty slot with blue->red recolor
const newGids = {}
if (!alreadyRed) {
for (const [label, gid] of [['left', GATE_LEFT.gid], ['right', GATE_RIGHT.gid]]) {
  const srcIdx = gid - HOUSE_FIRSTGID
  const dstIdx = emptySlots.find((i) => !Object.values(newGids).includes(HOUSE_FIRSTGID + i))
  const sx = (srcIdx % cols) * TILE
  const sy = Math.floor(srcIdx / cols) * TILE
  const dx = (dstIdx % cols) * TILE
  const dy = Math.floor(dstIdx / cols) * TILE
  let changed = 0
  for (let ty = 0; ty < TILE; ty += 1) {
    for (let tx = 0; tx < TILE; tx += 1) {
      const px4 = get(px, w, bpp, sx + tx, sy + ty)
      const out = isBlue(px4) ? blueToRed(px4) : px4
      if (out !== px4) changed += 1
      set(px, w, bpp, dx + tx, dy + ty, out)
    }
  }
  newGids[label] = HOUSE_FIRSTGID + dstIdx
  console.log(`${label} gate: ${gid} -> red variant ${newGids[label]} (slot ${dstIdx}), ${changed} px recolored`)
}
} else {
  newGids.left = cellGid(GATE_LEFT.x, GATE_LEFT.y)
  newGids.right = cellGid(GATE_RIGHT.x, GATE_RIGHT.y)
  console.log(`Gates already red: left=${newGids.left} right=${newGids.right}; skipping tile recolor`)
}

writePNG(HOUSE_PNG, w, h, colorType, chunkRows(px, w, bpp, h))
console.log(`Wrote ${HOUSE_PNG}`)

// repoint the two compound cells and clear the debris cells in MAP.json
// repoint the two compound cells and clear the debris cells in MAP.json
obs[y_x(GATE_LEFT)] = newGids.left
obs[y_x(GATE_RIGHT)] = newGids.right
for (const [x, y] of DEBRIS_CELLS) {
  const i = y * mapW + x
  console.log(`clear debris (${x},${y}): ${obs[i] || '(empty)'} -> 0`)
  obs[i] = 0
}
unflatten(obstacles, obs)
fs.writeFileSync(MAP_JSON, JSON.stringify(map, null, 2) + '\n')
console.log(`Wrote ${MAP_JSON}`)
console.log(`Red gate GIDs: left=${newGids.left} right=${newGids.right}`)

function y_x({ x, y }) { return y * mapW + x }
function chunkRows(px, w, bpp, h) {
  const stride = w * bpp
  const rows = []
  for (let y = 0; y < h; y += 1) rows.push(Buffer.from(px.subarray(y * stride, (y + 1) * stride)))
  return rows
}
function unflatten(target, flatArr) {
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < mapW; x += 1) {
      if (Array.isArray(target[y])) target[y][x] = flatArr[y * mapW + x]
    }
  }
  if (!Array.isArray(target[0])) {
    for (let i = 0; i < flatArr.length; i += 1) target[i] = flatArr[i]
  }
}
