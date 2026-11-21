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

type ActivePathSearch = {
  parents: Map<number, number>
  queue: number[]
  head: number
  startTileX: number
  startTileY: number
}

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
  private activeSearch: ActivePathSearch | null = null
  private lastNow = 0

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

  /** True while this NPC has a resumable BFS job waiting for a frame slice. */
  get hasPendingSearch(): boolean {
    return this.activeSearch !== null
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

  /** Starts a resumable BFS using the current live grid and occupancy callbacks. */
  private beginRouteSearch(npc: Npc): void {
    const startTileX = Math.floor(npc.sprite.x / NPC_TILE_SIZE)
    const startTileY = Math.floor((npc.sprite.y - NPC_TILE_SIZE / 2) / NPC_TILE_SIZE)
    this.startTileX = startTileX
    this.startTileY = startTileY

    const startIndex = startTileY * this.grid.width + startTileX
    const parents = new Map<number, number>()
    parents.set(startIndex, -1)
    this.activeSearch = {
      parents,
      queue: [startIndex],
      head: 0,
      startTileX,
      startTileY,
    }
  }

  /**
   * Advances at most `maxNodes` BFS expansions. The scheduler calls this in
   * short round-robin slices so no ambient NPC can monopolize a game frame.
   */
  advanceSearch(maxNodes: number): number {
    const search = this.activeSearch
    const allowance = Math.max(0, Math.floor(maxNodes))
    if (!search || allowance === 0) return 0

    let processed = 0
    while (
      this.activeSearch === search &&
      search.head < search.queue.length &&
      processed < allowance
    ) {
      const index = search.queue[search.head]
      search.head += 1
      processed += 1

      // Keep the same expansion cap as the previous synchronous flood fill.
      if (search.parents.size > this.maxSearchNodes) {
        this.activeSearch = null
        this.dwellEndsAt = this.lastNow + this.randomDwell()
        break
      }

      const x = index % this.grid.width
      const y = Math.floor(index / this.grid.width)
      // Preserve the former BFS order exactly: right, left, down, up. This
      // keeps seeded destination selection stable across the incremental refactor.
      this.addSearchNeighbour(search, x + 1, y, index)
      this.addSearchNeighbour(search, x - 1, y, index)
      this.addSearchNeighbour(search, x, y + 1, index)
      this.addSearchNeighbour(search, x, y - 1, index)
    }

    if (this.activeSearch === search && search.head >= search.queue.length) {
      this.activeSearch = null
      const targetIndex = this.chooseDestination(
        search.parents,
        search.startTileX,
        search.startTileY,
      )
      if (targetIndex === null) {
        this.dwellEndsAt = this.lastNow + this.randomDwell()
        return processed
      }

      const path = this.buildPath(search.parents, targetIndex, this.grid.width)
      if (path.length < 2) {
        this.dwellEndsAt = this.lastNow + this.randomDwell()
        return processed
      }

      this.path = path
      this.pathIndex = 1
      this.isWalking = true
      this.applyFacing(this.headingForStep())
    }

    return processed
  }

  private addSearchNeighbour(
    search: ActivePathSearch,
    x: number,
    y: number,
    parentIndex: number,
  ): void {
    if (x < 0 || y < 0 || x >= this.grid.width || y >= this.grid.height) return
    const index = y * this.grid.width + x
    if (search.parents.has(index)) return
    if (!this.grid.isTileWalkable(x, y)) return
    // Region and occupancy predicates remain live for every expansion; never
    // snapshot them before a multi-frame search.
    if (this.regionMask && !this.regionMask(x, y)) return
    if (this.isOccupied(x, y)) return
    search.parents.set(index, parentIndex)
    search.queue.push(index)
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

  update(npc: Npc, deltaMs: number, now: number, paused: boolean): void {
    this.lastNow = now
    if (paused) {
      this.started = false
      this.isWalking = false
      // Drop both route and partial search so resume uses the current gate,
      // walkability and occupancy state rather than stale planning results.
      this.path = []
      this.pathIndex = 0
      this.activeSearch = null
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
      if (!this.activeSearch && now >= this.dwellEndsAt) {
        // The scene scheduler advances this fresh search in bounded slices.
        this.beginRouteSearch(npc)
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
    if (
      !this.grid.isTileWalkable(stepTileX, stepTileY) ||
      (this.regionMask !== null && !this.regionMask(stepTileX, stepTileY)) ||
      this.isOccupied(stepTileX, stepTileY) ||
      !this.canStandAt(targetX, targetY)
    ) {
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
