export type PathSearchTask = {
  readonly hasPendingSearch: boolean
  advanceSearch(maxNodes: number): number
}

export type PathSearchSchedulerOptions = {
  nodeBudget?: number
  perTaskBudget?: number
  timeBudgetMs?: number
  startIndex?: number
  clock?: () => number
}

export type PathSearchSchedulerResult = {
  processedNodes: number
  nextStartIndex: number
  durationMs: number
}

/**
 * Advances pending path searches fairly, rotating the first task every frame.
 * The shared node cap is deterministic; the wall-clock guard protects slower
 * devices when live collision/occupancy predicates are more expensive.
 */
export function advanceSearchesRoundRobin(
  tasks: readonly PathSearchTask[],
  options: PathSearchSchedulerOptions = {},
): PathSearchSchedulerResult {
  if (tasks.length === 0) {
    return { processedNodes: 0, nextStartIndex: 0, durationMs: 0 }
  }

  const nodeBudget = Math.max(0, Math.floor(options.nodeBudget ?? 256))
  const perTaskBudget = Math.max(1, Math.floor(options.perTaskBudget ?? 32))
  const timeBudgetMs = Math.max(0, options.timeBudgetMs ?? 2)
  const clock = options.clock ?? (() => (
    typeof performance !== 'undefined' ? performance.now() : Date.now()
  ))
  const startedAt = clock()
  const startIndex = Math.abs(Math.floor(options.startIndex ?? 0)) % tasks.length
  let cursor = startIndex
  let processedNodes = 0
  let idleVisits = 0

  while (processedNodes < nodeBudget && idleVisits < tasks.length) {
    if (clock() - startedAt >= timeBudgetMs) break

    const task = tasks[cursor]
    cursor = (cursor + 1) % tasks.length
    if (!task?.hasPendingSearch) {
      idleVisits += 1
      continue
    }

    const allowance = Math.min(perTaskBudget, nodeBudget - processedNodes)
    const processed = task.advanceSearch(allowance)
    const safeProcessed = Number.isFinite(processed)
      ? Math.max(0, Math.min(allowance, Math.floor(processed)))
      : 0

    processedNodes += safeProcessed
    idleVisits = safeProcessed > 0 ? 0 : idleVisits + 1
  }

  return {
    processedNodes,
    nextStartIndex: cursor,
    durationMs: Math.max(0, clock() - startedAt),
  }
}
