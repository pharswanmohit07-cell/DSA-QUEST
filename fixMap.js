import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectDirectory = dirname(fileURLToPath(import.meta.url))
const mapPath = join(projectDirectory, 'src', 'assets', 'tiles', 'ninja-village', 'MAP.json')
const mapJson = JSON.parse(await readFile(mapPath, 'utf8'))

const pathGids = new Set([
  510, 511, 515, 516, 525, 540, 541, 552, 556, 558, 559, 560, 561, 564, 567, 568, 569, 570,
  571,  578, 579, 581, 594, 596, 597, 600, 601, 603, 604, 606, 608, 619, 622, 623, 624, 625,
  626, 633, 634, 635, 636, 639, 640, 641, 646, 651, 652, 664, 665, 666, 710, 713, 714, 725,
  729, 733, 734, 736, 737, 740, 743, 744, 745, 746, 748, 755, 756, 761, 763, 770, 773, 776,
  778, 779, 781, 782, 784, 786, 791, 792, 794, 795, 805, 806, 808, 809, 812, 827, 912, 929,
  948, 949, 971, 973, 974, 1041, 1042, 1059, 1063, 1064, 1082, 1542, 1543, 1544, 1575, 1576,
  1577, 2428,
])

const waterSurfaceGids = new Set([
  68, 96, 124, 169, 170, 171, 197, 199, 202, 203, 225, 226, 227, 230, 231,
])

const overheadGids = new Set([
  1124, 1125, 1126, 1127, 1128, 1129, 1130, 1131, 1132, 1133, 1134, 1135, 1136, 1137, 1138,
  1139, 1157, 1158, 1159, 1160, 1161, 1162, 1163, 1164, 1165, 1166, 1167, 1168, 1169, 1170,
  1171, 1172, 1846, 1847, 1848, 1884, 1885, 1886, 1887, 1888, 1889, 1890, 1909, 1910, 1911,
  1912, 1913, 1914,
])

const width = mapJson.width
const height = mapJson.height
const totalTiles = width * height
const groundData = new Array(totalTiles).fill(0)
const obstaclesData = new Array(totalTiles).fill(0)
const overheadData = new Array(totalTiles).fill(0)

for (const layer of mapJson.layers) {
  if (layer.type !== 'tilelayer') {
    continue
  }
  if (!Array.isArray(layer.data) || layer.data.length !== totalTiles) {
    throw new Error(`Tile layer '${layer.name}' does not contain exactly ${totalTiles} tiles`)
  }

  for (let index = 0; index < totalTiles; index += 1) {
    const gid = layer.data[index]
    if (gid === 0) {
      continue
    }

    if (waterSurfaceGids.has(gid)) {
      groundData[index] = gid
      obstaclesData[index] = gid
    } else if (pathGids.has(gid)) {
      groundData[index] = gid
    } else if (overheadGids.has(gid)) {
      overheadData[index] = gid
    } else {
      obstaclesData[index] = gid
    }
  }
}

const transparentWaterObjectGids = new Set([26, 27, 28, 54])
for (let index = 0; index < totalTiles; index += 1) {
  if (groundData[index] === 0 && transparentWaterObjectGids.has(obstaclesData[index])) {
    groundData[index] = 68
  }
}

mapJson.layers = [
  {
    data: groundData,
    height,
    id: 1,
    name: '0_Ground',
    opacity: 1,
    type: 'tilelayer',
    visible: true,
    width,
    x: 0,
    y: 0,
  },
  {
    data: obstaclesData,
    height,
    id: 2,
    name: '1_Obstacles',
    opacity: 1,
    type: 'tilelayer',
    visible: true,
    width,
    x: 0,
    y: 0,
  },
  {
    data: overheadData,
    height,
    id: 3,
    name: '2_AbovePlayer',
    opacity: 1,
    type: 'tilelayer',
    visible: true,
    width,
    x: 0,
    y: 0,
  },
]

await writeFile(mapPath, `${JSON.stringify(mapJson, null, 2)}\n`)
console.log('MAP.json successfully reorganized into 0_Ground, 1_Obstacles, and 2_AbovePlayer layers.')
