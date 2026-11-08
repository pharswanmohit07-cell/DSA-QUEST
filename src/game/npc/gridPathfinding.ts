export type GridPoint = { x: number; y: number }

export function npcFootprintCells(
  worldX: number,
  worldY: number,
  tileWidth = 16,
  tileHeight = 16,
): GridPoint[] {
  const bodyLeft = worldX - 5
  const bodyRight = worldX + 5
  const bodyTop = worldY - 9
  const bodyBottom = worldY - 1
  const minTileX = Math.floor(bodyLeft / tileWidth)
  const maxTileX = Math.floor((bodyRight - 0.001) / tileWidth)
  const minTileY = Math.floor(bodyTop / tileHeight)
  const maxTileY = Math.floor((bodyBottom - 0.001) / tileHeight)
  const cells: GridPoint[] = []
  for (let y = minTileY; y <= maxTileY; y += 1) {
    for (let x = minTileX; x <= maxTileX; x += 1) {
      cells.push({ x, y })
    }
  }
  return cells
}

const CARDINAL_STEPS: readonly GridPoint[] = [
  { x: 0, y: -1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
]

const pointKey = (point: GridPoint): string => `${point.x},${point.y}`

/**
 * Finds a cardinal-only route on the authored tile grid.
 *
 * The caller supplies the collision semantics, so map-specific walk-behind
 * rules and NPC safe-area exclusions remain authoritative outside this helper.
 */
export function findGridPath(
  start: GridPoint,
  goal: GridPoint,
  isWalkable: (point: GridPoint) => boolean,
  width: number,
  height: number,
): GridPoint[] | null {
  if (
    start.x < 0 ||
    start.y < 0 ||
    goal.x < 0 ||
    goal.y < 0 ||
    start.x >= width ||
    goal.x >= width ||
    start.y >= height ||
    goal.y >= height ||
    !isWalkable(start) ||
    !isWalkable(goal)
  ) {
    return null
  }
  if (start.x === goal.x && start.y === goal.y) return []

  const open = [{ point: start, score: manhattan(start, goal) }]
  const cameFrom = new Map<string, GridPoint>()
  const cost = new Map<string, number>([[pointKey(start), 0]])
  const openKeys = new Set([pointKey(start)])

  while (open.length > 0) {
    open.sort((left, right) => right.score - left.score)
    const current = open.pop()!.point
    const currentKey = pointKey(current)
    openKeys.delete(currentKey)

    if (current.x === goal.x && current.y === goal.y) {
      const path: GridPoint[] = []
      let cursor = current
      while (cursor.x !== start.x || cursor.y !== start.y) {
        path.push(cursor)
        cursor = cameFrom.get(pointKey(cursor))!
      }
      path.reverse()
      return path
    }

    const nextCost = cost.get(currentKey)! + 1
    for (const step of CARDINAL_STEPS) {
      const next = { x: current.x + step.x, y: current.y + step.y }
      if (
        next.x < 0 ||
        next.y < 0 ||
        next.x >= width ||
        next.y >= height ||
        !isWalkable(next)
      ) {
        continue
      }
      const nextKey = pointKey(next)
      if (nextCost >= (cost.get(nextKey) ?? Number.POSITIVE_INFINITY)) continue
      cameFrom.set(nextKey, current)
      cost.set(nextKey, nextCost)
      if (!openKeys.has(nextKey)) {
        open.push({ point: next, score: nextCost + manhattan(next, goal) })
        openKeys.add(nextKey)
      }
    }
  }

  return null
}

function manhattan(left: GridPoint, right: GridPoint): number {
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y)
}
