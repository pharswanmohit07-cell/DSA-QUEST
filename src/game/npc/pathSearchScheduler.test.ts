import { describe, expect, it } from 'vitest'
import { advanceSearchesRoundRobin, type PathSearchTask } from './pathSearchScheduler'

function task(totalNodes: number): PathSearchTask & { processed: number } {
  let remaining = totalNodes
  return {
    processed: 0,
    get hasPendingSearch() {
      return remaining > 0
    },
    advanceSearch(maxNodes) {
      const count = Math.min(remaining, maxNodes)
      remaining -= count
      this.processed += count
      return count
    },
  }
}

describe('advanceSearchesRoundRobin', () => {
  it('never exceeds the shared node budget', () => {
    const tasks = [task(100), task(100), task(100)]
    const result = advanceSearchesRoundRobin(tasks, {
      nodeBudget: 17,
      perTaskBudget: 4,
      timeBudgetMs: 100,
    })

    expect(result.processedNodes).toBe(17)
    expect(tasks.reduce((sum, item) => sum + item.processed, 0)).toBe(17)
  })

  it('limits every individual slice and shares work across pending searches', () => {
    const tasks = [task(100), task(100), task(100)]
    const result = advanceSearchesRoundRobin(tasks, {
      nodeBudget: 24,
      perTaskBudget: 3,
      timeBudgetMs: 100,
    })

    expect(result.processedNodes).toBe(24)
    expect(tasks.map((item) => item.processed)).toEqual([9, 9, 6])
  })

  it('rotates the first search using the stable cursor', () => {
    const tasks = [task(100), task(100), task(100)]
    const first = advanceSearchesRoundRobin(tasks, {
      nodeBudget: 4,
      perTaskBudget: 2,
      timeBudgetMs: 100,
      startIndex: 1,
    })
    expect(tasks.map((item) => item.processed)).toEqual([0, 2, 2])
    expect(first.nextStartIndex).toBe(0)

    const second = advanceSearchesRoundRobin(tasks, {
      nodeBudget: 2,
      perTaskBudget: 2,
      timeBudgetMs: 100,
      startIndex: first.nextStartIndex,
    })
    expect(tasks.map((item) => item.processed)).toEqual([2, 2, 2])
  })

  it('skips completed tasks and returns safely for an empty task list', () => {
    const completed = task(0)
    const pending = task(3)
    const result = advanceSearchesRoundRobin([completed, pending], {
      nodeBudget: 8,
      perTaskBudget: 2,
      timeBudgetMs: 100,
    })

    expect(result.processedNodes).toBe(3)
    expect(completed.processed).toBe(0)
    expect(pending.processed).toBe(3)
    expect(advanceSearchesRoundRobin([])).toEqual({
      processedNodes: 0,
      nextStartIndex: 0,
      durationMs: 0,
    })
  })

  it('stops after a full pass when a pending task makes no progress', () => {
    let calls = 0
    const stuck: PathSearchTask = {
      hasPendingSearch: true,
      advanceSearch() {
        calls += 1
        return 0
      },
    }
    const result = advanceSearchesRoundRobin([stuck], {
      nodeBudget: 256,
      perTaskBudget: 32,
      timeBudgetMs: 100,
    })

    expect(calls).toBe(1)
    expect(result.processedNodes).toBe(0)
  })

  it('honours the wall-clock budget', () => {
    const tasks = [task(100), task(100)]
    let now = 0
    const result = advanceSearchesRoundRobin(tasks, {
      nodeBudget: 100,
      perTaskBudget: 10,
      timeBudgetMs: 2,
      clock: () => {
        const current = now
        now += 1
        return current
      },
    })

    expect(result.processedNodes).toBeLessThan(100)
    expect(tasks[0]?.processed).toBeLessThanOrEqual(10)
    expect(tasks[1]?.processed).toBeLessThanOrEqual(10)
  })
})
