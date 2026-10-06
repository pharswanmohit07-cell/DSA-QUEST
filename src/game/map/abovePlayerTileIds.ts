/**
 * Decorative tiles that get duplicated onto the above-player layer.
 *
 * The obstacle layer holds the village's geometry, but tall or overhanging art
 * renders behind the player there, so the character appears to walk over it.
 *
 * The art is duplicated onto `2_AbovePlayer`, which draws at a much higher
 * depth. The original remains on `1_Obstacles`; roofs and leaves are explicitly
 * made non-colliding there, while walls and tree trunks retain solid collision.
 *
 * Each GID is a global tile id from `MAP.json`; they were identified by
 * inspecting the tileset sheets. Ranges are inclusive.
 */
const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, index) => from + index)

/** Torii gate arch: the crossbeam that spans above the player's head. */
const TORII_ARCH_TOP_GIDS: readonly number[] = [1602, 1603]

/** Upper and middle rails of the timber fence/log boundary. */
const FENCE_TOP_GIDS: readonly number[] = [
  ...range(1242, 1244),
  ...range(1275, 1277),
  ...range(1265, 1267),
  ...range(1465, 1467),
]

/** Roofs, eaves and the upper row of the snowfield igloos. */
const ROOF_TOP_GIDS: readonly number[] = [
  ...range(1124, 1139),
  ...range(1157, 1172),
  ...range(1239, 1241),
  ...range(1285, 1287),
  ...range(1318, 1320),
  ...range(1487, 1495),
]

/** Upper foliage rows; tree bases and trunk tiles remain on the obstacle layer. */
const CANOPY_TOP_GIDS: readonly number[] = [
  ...range(1884, 1890),
  ...range(1897, 1898),
  ...range(1901, 1902),
  ...range(1935, 1938),
  ...range(1947, 1950),
  ...range(1959, 1962),
  ...range(2011, 2014),
  ...range(2035, 2038),
  2081,
  2086,
  ...range(2321, 2323),
  ...range(2345, 2347),
  2369,
  2371,
  ...range(2315, 2317),
  ...range(2339, 2341),
  2363,
  2365,
]

/** Upper tiers of brown and grey rock formations; their feet remain solid. */
const BOULDER_TOP_GIDS: readonly number[] = [
  ...range(2091, 2092),
  ...range(2140, 2142),
  ...range(2144, 2145),
  ...range(2164, 2169),
  ...range(2234, 2239),
  ...range(2258, 2263),
]

/** Upper frames of the desert arch and stone statues; base tiles stay solid. */
const STONE_STRUCTURE_TOP_GIDS: readonly number[] = [
  ...range(1813, 1815),
  ...range(1822, 1823),
  ...range(1846, 1848),
]

/** Fence/wall top art: it is duplicated visually but remains a solid line. */
export const VILLAGE_FENCE_SOLID_GIDS: readonly number[] = [
  ...FENCE_TOP_GIDS,
]

/** Upper visual rows of the paired village pillars; their bottom footprint remains solid. */
const VILLAGE_PILLAR_TOP_GIDS: readonly number[] = [1619, 1652, 1688, 1689]

/** Small village props stay solid as footprint-only objects. */
export const VILLAGE_SMALL_PROP_BASE_GIDS: readonly number[] = [
  2079,
  2291,
  1754,
  1755,
  1584,
  1585,
]

/** Upper foliage/body art for the village's two narrow trees. */
const VILLAGE_TREE_UPPER_GIDS: readonly number[] = [
  2147, 2148, 2150, 2151,
  2231, 2255,
]

/**
 * Position-only upper-art exceptions for GIDs that are also used by solid props.
 * These are intentionally limited to mixed-GID cells; all other roles are GID-based.
 */
export const VILLAGE_UPPER_ART_POSITION_EXCEPTIONS: ReadonlySet<string> = new Set([
  '18,15',
])

/** Solid footprint tiles for the paired village pillars. */
export const VILLAGE_PILLAR_BASE_GIDS: readonly number[] = [1721, 1722]

/** Upper wall/roof art used by the village houses and dojo. Bottom/base tiles stay solid. */
const VILLAGE_HOUSE_UPPER_GIDS: readonly number[] = [
  1140, 1141, 1142, 1143, 1144, 1145, 1146, 1147, 1148, 1149, 1150, 1151, 1152,
  1173, 1174, 1175, 1176, 1177, 1178, 1179, 1180, 1181, 1182, 1183, 1184, 1185,
  1206, 1208, 1209, 1210, 1212, 1213, 1215, 1216, 1218,
    1380, 1381, 1382, 1383,
  1413, 1414, 1415, 1416,
  1446, 1447, 1448, 1449,
  1479, 1480, 1481, 1482,
  1497, 1498, 1499, 1500,
  1512, 1515,
  1545, 1546, 1547, 1548,
  1569, 1570, 1571,
  1611, 1612, 1613, 1614, 1615, 1616,
  1643, 1644, 1645, 1646, 1647,
  1677, 1678, 1679, 1680,
  1710, 1713,
  1770, 1771, 1772,
  1803, 1804, 1805,
]

/** Snow cap on the border pillar; the underlying rock remains its solid base. */
const SNOW_PILLAR_TOP_GIDS: readonly number[] = [2404]

/** Middle/body row of the front-gate frog statues; the bottom row remains solid. */
const FROG_STATUE_MIDDLE_GIDS: readonly number[] = [
  1520,
  1521,
  1522,
  1523,
  1524,
  1525,
  1526,
  1527,
  1528,
]

/** Upper art does not block the player; fences, bases and trunks remain solid. */
export const NON_SOLID_OVERHANG_TILE_IDS: ReadonlySet<number> = new Set<number>([
  ...FROG_STATUE_MIDDLE_GIDS,
  ...ROOF_TOP_GIDS,
  ...CANOPY_TOP_GIDS,
  ...BOULDER_TOP_GIDS,
  ...STONE_STRUCTURE_TOP_GIDS,
  ...VILLAGE_PILLAR_TOP_GIDS,
  ...VILLAGE_HOUSE_UPPER_GIDS,
  ...VILLAGE_TREE_UPPER_GIDS,
  ...SNOW_PILLAR_TOP_GIDS,
])

/** Every GID eligible for duplication, as a single lookup set. */
export const ABOVE_PLAYER_TILE_IDS: ReadonlySet<number> = new Set<number>([
  ...FROG_STATUE_MIDDLE_GIDS,
  ...TORII_ARCH_TOP_GIDS,
  ...FENCE_TOP_GIDS,
  ...ROOF_TOP_GIDS,
  ...CANOPY_TOP_GIDS,
  ...BOULDER_TOP_GIDS,
  ...STONE_STRUCTURE_TOP_GIDS,
  ...VILLAGE_PILLAR_TOP_GIDS,
  ...VILLAGE_HOUSE_UPPER_GIDS,
  ...VILLAGE_TREE_UPPER_GIDS,
  ...SNOW_PILLAR_TOP_GIDS,
])

/** Named groups, kept for diagnostics and so the map can be audited later. */
export const ABOVE_PLAYER_TILE_GROUPS: ReadonlyArray<{ name: string; tileIds: readonly number[] }> = [
  { name: 'torii arch top', tileIds: TORII_ARCH_TOP_GIDS },
  { name: 'fence top', tileIds: FENCE_TOP_GIDS },
  { name: 'roof top / eaves', tileIds: ROOF_TOP_GIDS },
  { name: 'tree canopy', tileIds: CANOPY_TOP_GIDS },
  { name: 'upper boulder and rock tiers', tileIds: BOULDER_TOP_GIDS },
  { name: 'cave arch and statue tops', tileIds: STONE_STRUCTURE_TOP_GIDS },
  { name: 'central village pillar tops', tileIds: VILLAGE_PILLAR_TOP_GIDS },
  { name: 'village house / dojo upper walls and roofs', tileIds: VILLAGE_HOUSE_UPPER_GIDS },
  { name: 'village tree upper art', tileIds: VILLAGE_TREE_UPPER_GIDS },
  {
    name: 'snowfield tree canopies',
    tileIds: [
      ...range(2011, 2014),
      ...range(2035, 2038),
      ...range(2321, 2323),
      ...range(2345, 2347),
      2369,
      2371,
    ],
  },
  { name: 'snowfield pillar cap', tileIds: SNOW_PILLAR_TOP_GIDS },
]
