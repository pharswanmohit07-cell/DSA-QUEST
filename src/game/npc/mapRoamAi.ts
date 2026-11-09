import type { Npc } from './Npc'
import type { CardinalDirection, NpcRandomSource } from './roamAi'
import { NPC_TILE_SIZE } from './roamAi'
import type { AmbientMovementProfile, NpcHomeRegion } from './movementProfiles'
import { NPC_MACRO_REGION_BANDS } from './movementProfiles'
import {
  NPC_RESERVED_DESTINATION_CELLS,
  isNpcSafeWorldPosition,
  isSnowfieldTile,
  npcRegionForTile,
  tileInNpcRegion,
} from '../map/npcSafeAreas'

/**
 * Dedicated ambient-roaming AI: BFS over the live walkable grid.
 *
 * Unlike `RoamAi` (small-radius heading picker) or `PatrolAi` (authored
 * polyline), `MapRoamAi` discovers its own destinations: it flood-fills the
 * walkable map, picks a reachable tile farther than the profile's minimum
 * distance, walks the BFS path step by step — checking collision with the
 * *full* NPC footprint each step — then dwells, re-floods, and goes again.
 *
 * Key properties:
 * - Movement is continuous (per-frame interpolation), never a teleport.
 * - A step that would leave walkable ground cancels the route; the NPC waits
 *   for the next dwell and re-plans (covers a gate that locks mid-journey).
 * - A gate that unlocks again is discovered automatically on the next
 *   re-plan, because the BFS always runs against the *current* grid.
 * - Other NPCs' occupied tiles are avoided both as destinations and as path
 *   steps, so two roamers never try to stand in the same spot.
 * - The AI supports pause/resume through the same `paused` flag contract the
 *   other AI implementations honour, so dialogue/integration keeps working.
 */

/** Same world→tile rounding the scene uses for its pixel-centred sprites. */
export function tileCenterX(tileX: number, tileSize = NPC_TILE_SIZE): number {
  return tileX * tileSize + tileSize / 2
}

/** The NPC's feet sit at the bottom edge of its tile. */
export function tileFootY(tileY: number, tileSize = NPC_TILE_SIZE): number {
  return (tileY + 1) * tileSize
}

export type MapRoamGrid = {
  width: number
  height: number
  /** True when a full NPC body may stand centred on this tile. */
  isTileWalkable: (x: number, y: number) => boolean
}

/**
 * True when `(tileX, tileY)` is a valid destination tile for the given macro
 * region. An NPC may only stand on tiles whose band belongs to its macro
 * region, and never on snowfield tiles unless it is a snow NPC. Village NPCs
 * may stand anywhere in the five village bands (plaza, gate road, sand road,
 * southern residential, eastern field) but never on snowfield ground even
 * when a gate unlocks — the torii gate corridor itself is central-plaza band,
 * so crossing it is legal, standing on row ≤ 13 is not.
 */
export function tileInMacroRegion(
  region: NpcHomeRegion,
  tileX: number,
  tileY: number,
): boolean {
  const bands = NPC_MACRO_REGION_BANDS[region]
  const band = npcRegionForTile(tileX, tileY)
  if (!band || !bands.includes(band)) return false
  // The northern-field band overlaps the western-gate-road band. For snow NPCs
  // the gate-road strip still counts as snow region (it is north of the gate
  // threshold); for village NPCs the gate-road strip is village ground. The
  // decisive rule is the snow check: any tile in the snowfield band that is
  // not explicitly village-banded is snow-only ground.
  if (region === 'snow') return tileInNpcRegion('northern-field', tileX, tileY)
  // Village/dungeon NPCs can never stand on snowfield ground.
  if (isSnowfieldTile(tileX, tileY)) return false
  return true
}

export type MapRoamDeps = {
  profile: AmbientMovementProfile
  grid: MapRoamGrid
  /** World-pixel collision test for the NPC's full footprint. */
  canStandAt: (x: number, y: number) => boolean
  applyFacing: (direction: CardinalDirection) => void
  /** Tiles currently reserved by other NPCs. */
  isOccupied?: (x: number, y: number) => boolean
  random?: NpcRandomSource
  /** Max BFS expansions per plan; guards against pathological grids. */
  maxSearchNodes?: number
  /**
   * Region mask: true when `(x, y)` may be occupied by this NPC's assigned
   * macro region. Supplied by the scene (and by the regional tests); when
   * omitted the BFS is purely topological, which is what the legacy unit
   * tests exercise.
   */
  regionMask?: (x: number, y: number) => boolean
}

type Path = Array<{ x: number; y: number }>

export class MapRoamAi {
  private readonly profile: AmbientMovementProfile
  private readonly grid: MapRoamGrid
  private readonly canStandAt: (x: number, y: number) => boolean
  private readonly applyFacing: (direction: CardinalDirection) => void
  private readonly isOccupied: (x: number, y: number) => boolean
  private readonly regionMask: ((x: number, y: number) => boolean) | null
  private readonly random: NpcRandomSource
  private readonly maxSearchNodes: number

  private path: Path = []
  private pathIndex = 0
  private isWalking = false
  private dwellEndsAt = 0
  private started = false
  private startTileX = 0
  private startTileY = 0

  constructor(deps: MapRoamDeps) {
    this.profile = deps.profile
    this.grid = deps.grid
    this.canStandAt = deps.canStandAt
    this.applyFacing = deps.applyFacing
    this.isOccupied = deps.isOccupied ?? (() => false)
    this.regionMask = deps.regionMask ?? null
    this.random = deps.random ?? Math.random
    this.maxSearchNodes = deps.maxSearchNodes ?? 6000
  }

  /** True while the NPC is actively interpolating between tiles. */
  get walking(): boolean {
    return this.isWalking
  }

  /** The remaining path; exposed for dev-only debug overlays. */
  get remainingPath(): ReadonlyArray<{ x: number; y: number }> {
    return this.path.slice(this.pathIndex)
  }

  get currentDestination(): { x: number; y: number } | null {
    return this.remainingPath.length > 0 ? this.remainingPath[this.remainingPath.length - 1] : null
  }

  /** Initial tile anchor, captured on the first unpaused update. */
  get originTile(): { x: number; y: number } {
    return { x: this.startTileX, y: this.startTileY }
  }

  /**
   * Flood-fills walkable tiles from `(startTileX, startTileY)` and returns the
   * BFS parent map. Returns `null` when the search budget is exhausted first
   * (caller treats that as "no route this frame").
   */
  private floodFill(startTileX: number, startTileY: number): Map<number, number> | null {
    const { width, height, isTileWalkable } = this.grid
    const startIndex = startTileY * width + startTileX
    const parents = new Map<number, number>()
    parents.set(startIndex, -1)
    const queue: number[] = [startIndex]
    let head = 0
    while (head < queue.length) {
      const index = queue[head]
      head += 1
      if (parents.size > this.maxSearchNodes) return null
      const x = index % width
      const y = Math.floor(index / width)
      const neighbours: Array<[number, number]> = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]
      for (const [nx, ny] of neighbours) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
        const nIndex = ny * width + nx
        if (parents.has(nIndex)) continue
        if (!isTileWalkable(nx, ny)) continue
        // Region mask: a neighbour outside this NPC's macro region is never
        // expanded, so the path itself cannot cross into another region.
        if (this.regionMask && !this.regionMask(nx, ny)) continue
        if (this.isOccupied(nx, ny)) continue
        parents.set(nIndex, index)
        queue.push(nIndex)
      }
    }
    return parents
  }

  /**
   * Picks a random reachable tile at least `minDestinationTiles` away (in tile
   * units) from the start. Falls back to the closest eligible tile when no
   * random pick qualifies within the search budget; returns `null` when the
   * component is smaller than the minimum distance everywhere.
   */
  private chooseDestination(
    parents: Map<number, number>,
    startTileX: number,
    startTileY: number,
  ): number | null {
    const { width } = this.grid
    const candidates: number[] = []
    const nearCandidates: number[] = []
    for (const index of parents.keys()) {
      const x = index % width
      const y = Math.floor(index / width)
      if (x === startTileX && y === startTileY) continue
      // Reserved destination cells (gate approach, spawn, quest NPCs) are not
      // valid *destinations* — they may still be crossed mid-path.
      if (NPC_RESERVED_DESTINATION_CELLS.has(`${x},${y}`)) continue
      if (this.regionMask && !this.regionMask(x, y)) continue
      if (!isNpcSafeWorldPosition(x * NPC_TILE_SIZE + NPC_TILE_SIZE / 2, (y + 1) * NPC_TILE_SIZE)) continue
      const distance = Math.hypot(x - startTileX, y - startTileY)
      if (distance >= this.profile.minDestinationTiles) candidates.push(index)
      else nearCandidates.push(index)
    }
    if (candidates.length === 0) {
      if (nearCandidates.length === 0) return null
      return nearCandidates[Math.floor(this.random() * nearCandidates.length)] ?? null
    }
    return candidates[Math.floor(this.random() * candidates.length)] ?? null
  }

  /** Builds the tile path from start to `targetIndex` via the parent map. */
  private buildPath(parents: Map<number, number>, targetIndex: number, width: number): Path {
    const path: Path = []
    let cursor = targetIndex
    while (cursor !== -1) {
      const x = cursor % width
      const y = Math.floor(cursor / width)
      path.push({ x, y })
      const parent = parents.get(cursor)
      if (parent === undefined) break
      cursor = parent
    }
    path.reverse()
    return path
  }

  /** Plans a new route from the NPC's current tile. Returns true on success. */
  private planRoute(npc: Npc): boolean {
    const startTileX = Math.floor(npc.sprite.x / NPC_TILE_SIZE)
    const startTileY = Math.floor((npc.sprite.y - NPC_TILE_SIZE / 2) / NPC_TILE_SIZE)
    // The region mask in floodFill below is itself the safety gate: if the NPC
    // somehow stands outside its assigned region, no neighbour expands and the
    // plan fails naturally instead of deepening the mistake.
    const parents = this.floodFill(startTileX, startTileY)
    if (!parents) return false
    const targetIndex = this.chooseDestination(parents, startTileX, startTileY)
    if (targetIndex === undefined || targetIndex === null) return false
    const path = this.buildPath(parents, targetIndex, this.grid.width)
    if (path.length < 2) return false
    this.path = path
    this.pathIndex = 1
    this.isWalking = true
    return true
  }

  update(npc: Npc, deltaMs: number, now: number, paused: boolean): void {
    if (paused) {
      this.started = false
      this.isWalking = false
      // Drop the route so a resume re-plans against the current world state
      // (an NPC may have moved, or a gate may have locked) instead of
      // resuming a stale path.
      this.path = []
      this.pathIndex = 0
      return
    }

    if (!this.started) {
      this.started = true
      this.startTileX = Math.floor(npc.sprite.x / NPC_TILE_SIZE)
      this.startTileY = Math.floor((npc.sprite.y - NPC_TILE_SIZE / 2) / NPC_TILE_SIZE)
      this.isWalking = false
      this.dwellEndsAt = now + this.randomDwell()
      return
    }

    if (!this.isWalking) {
      if (now >= this.dwellEndsAt) {
        // A fresh plan re-runs against the *current* grid, so a gate unlocked
        // (or a corridor an NPC vacated) becomes usable on the next journey.
        const planned = this.planRoute(npc)
        if (!planned) {
          this.dwellEndsAt = now + this.randomDwell()
          return
        }
        this.applyFacing(this.headingForStep())
      }
      return
    }

    if (this.pathIndex >= this.path.length) {
      this.isWalking = false
      this.dwellEndsAt = now + this.randomDwell()
      return
    }

    const stepTile = this.path[this.pathIndex]
    const stepTileX = stepTile?.x ?? this.startTileX
    const stepTileY = stepTile?.y ?? this.startTileY
    const targetX = tileCenterX(stepTileX)
    const targetY = tileFootY(stepTileY)

    // Full-footprint collision check, not just the centre tile. If the world
    // changed under us (a gate closed, an obstacle appeared) we drop the route
    // instead of cutting into solid art.
    if (!this.canStandAt(targetX, targetY)) {
      this.isWalking = false
      this.path = []
      this.pathIndex = 0
      this.dwellEndsAt = now + this.randomDwell()
      return
    }

    const direction = this.headingForStep()
    this.applyFacing(direction)
    const vector = directionVector(direction)
    const stepLength = (this.profile.speed * deltaMs) / 1000
    const deltaX = targetX - npc.sprite.x
    const deltaY = targetY - npc.sprite.y

    if (Math.abs(deltaX) <= stepLength && Math.abs(deltaY) <= stepLength) {
      npc.sprite.x = targetX
      npc.sprite.y = targetY
      this.pathIndex += 1
      if (this.pathIndex >= this.path.length) {
        this.isWalking = false
        this.dwellEndsAt = now + this.randomDwell()
      }
      return
    }

    npc.sprite.x += vector.x * stepLength
    npc.sprite.y += vector.y * stepLength
  }

  /** The cardinal heading needed to reach the next path tile. */
  private headingForStep(): CardinalDirection {
    const next = this.path[this.pathIndex]
    if (!next) return 'down'
    const current = this.path[this.pathIndex - 1]
    const fromX = current ? current.x : this.startTileX
    const fromY = current ? current.y : this.startTileY
    if (next.x > fromX) return 'right'
    if (next.x < fromX) return 'left'
    if (next.y > fromY) return 'down'
    return 'up'
  }

  private randomDwell(): number {
    const min = this.profile.minPauseDuration
    const max = this.profile.maxPauseDuration
    return (min + this.random() * (max - min)) * 1000
  }
}

function directionVector(direction: CardinalDirection): { x: number; y: number } {
  switch (direction) {
    case 'down': return { x: 0, y: 1 }
    case 'up': return { x: 0, y: -1 }
    case 'left': return { x: -1, y: 0 }
    case 'right': return { x: 1, y: 0 }
  }
}
