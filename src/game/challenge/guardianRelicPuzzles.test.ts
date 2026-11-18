import { describe, expect, it } from 'vitest'
import {
  LINKED_RELIC_TARGET,
  SEARCH_RELIC_TARGET,
  SEARCH_RELIC_VALUES,
  SORT_RELIC_START,
  TREE_RELIC_INSERT_VALUES,
} from './guardianRelicPuzzles'
import { LINKED_TARGETS } from './guardianRelicPuzzles'

describe('distinct later-guardian relic puzzles', () => {
  it('uses a separate linked-list order from both mastery rounds', () => {
    expect(LINKED_RELIC_TARGET).toEqual(['node-1', 'node-2', 'node-0'])
    expect(LINKED_RELIC_TARGET).not.toEqual(LINKED_MASTERY_TARGETS[0])
    expect(LINKED_RELIC_TARGET).not.toEqual(LINKED_MASTERY_TARGETS[1])
    expect(new Set(LINKED_RELIC_TARGET)).toEqual(new Set(['node-0', 'node-1', 'node-2']))
  })

  it('uses a longer sorted ledger and a distinct binary-search target', () => {
    expect(SEARCH_RELIC_VALUES).toHaveLength(9)
    expect(SEARCH_RELIC_VALUES).toEqual([...SEARCH_RELIC_VALUES].sort((a, b) => a - b))
    expect(SEARCH_RELIC_VALUES).toContain(SEARCH_RELIC_TARGET)
    expect(SEARCH_RELIC_TARGET).not.toBe(27)
  })

  it('uses a longer unsorted row for the Bubble Sort relic trial', () => {
    expect(SORT_RELIC_START.length).toBeGreaterThan(5)
    expect(SORT_RELIC_START).not.toEqual([...SORT_RELIC_START].sort((a, b) => a - b))
    expect(new Set(SORT_RELIC_START).size).toBe(SORT_RELIC_START.length)
  })

  it('uses an extended BST relic tree with unique values', () => {
    expect(TREE_RELIC_INSERT_VALUES.length).toBeGreaterThan(5)
    expect(new Set(TREE_RELIC_INSERT_VALUES).size).toBe(TREE_RELIC_INSERT_VALUES.length)
    expect(TREE_RELIC_INSERT_VALUES).toContain(27)
  })
})
