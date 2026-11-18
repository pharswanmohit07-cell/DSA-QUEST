export const LINKED_MASTERY_TARGETS = [
  ['node-1', 'node-0', 'node-2'],
  ['node-2', 'node-0', 'node-1'],
] as const

/** A third, distinct order used only for the Monk's optional relic trial. */
export const LINKED_RELIC_TARGET = ['node-1', 'node-2', 'node-0'] as const

/** Longer sorted manifest so the relic trial requires a deeper binary search. */
export const SEARCH_RELIC_VALUES = [2, 6, 11, 17, 23, 31, 38, 46, 55] as const
export const SEARCH_RELIC_TARGET = 46

/** Eight parcel values; the relic trial permits adjacent swaps only. */
export const SORT_RELIC_START = [9, 4, 7, 1, 8, 2, 6, 5] as const

/** Extended, distinct-value tree for the Shaman's optional relic trial. */
export const TREE_RELIC_INSERT_VALUES = [15, 8, 23, 4, 12, 19, 27, 2, 6] as const
