import type { Npc } from './Npc'
import type { WanderConfig } from './WanderAi'
import type { CardinalDirection } from './WanderAi'
import { findGridPath, type GridPoint } from './gridPathfinding'

export type { WanderConfig, CardinalDirection } from './WanderAi'

export type NpcRandomSource = () => number

export const CARDINALS: CardinalDirection[] = ['down', 'up', 'left', 'right']

export const DIRECTION_VECTORS: Record<CardinalDirection, { x: number; y: number }> = {
  down: { x: 0, y: 1 },
  up: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

/**
 * Picks the opposite cardinal heading, used when a walker bumps into an
 * obstacle or leash edge and should visibly turn around instead of standing.
 */
export function oppositeDirection(direction: CardinalDirection): CardinalDirection {
  switch (direction) {
    case 'down': return 'up'
    case 'up': return 'down'
    case 'left': return 'right'
    case 'right': return 'left'
  }
}

/** The village map's tile size in pixels; NPC tiles are always 16px. */
export const NPC_TILE_SIZE = 16

/**
 * Picks a uniformly random cardinal heading that is *actually* open at
 * `(tileX, tileY)`. Each of the four directions gets one probe, so an NPC in a
 * one-tile-wide corridor with a single exit still finds it on the first try and
 * an enclosed corner falls through to the fallback heading.
 *
 * `random` is injectable so movement is reproducible under test with a seeded
 * random source.
 */
export function pickOpenDirection(
  tileX: number,
  tileY: number,
  canStandAt: (x: number, y: number) => boolean,
  random: NpcRandomSource,
  fallback: CardinalDirection = 'down',
): CardinalDirection {
  const open = CARDINALS.filter((direction) => {
    const vector = DIRECTION_VECTORS[direction]
    return canStandAt((tileX + 0.5 + vector.x) * NPC_TILE_SIZE, (tileY + 1 + vector.y) * NPC_TILE_SIZE)
  })
  if (open.length === 0) return fallback
  return open[Math.floor(random() * open.length)] ?? fallback
}

/** Seeded linear congruential generator for deterministic tests. */
export function createSeededRandom(seed: number): NpcRandomSource {
  let state = seed % 2147483647
  if (state <= 0) state += 2147483646
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}

/**
 * Long-roam walking behaviour.
 *
 * `WanderAi` ambles in short bursts around a small home anchor, which is right
 * for shopkeepers and residents but reads as "stuck" for travellers who are
 * supposed to walk the length of a road. `RoamAi` keeps the same collision and
 * leash safety rules but chooses a *new heading when blocked* (turn-around)
 * rather than ending its walk, walks in longer phases, and pauses for longer.
 *
 * The home anchor still bounds the roam, so an NPC never strands itself out of
 * the player's reach.
 */
export class RoamAi {
  private readonly config: WanderConfig
  private readonly canStandAt: (x: number, y: number) => boolean
  private readonly applyFacing: (direction: CardinalDirection) => void
  private readonly random: NpcRandomSource

  private direction: CardinalDirection = 'down'
  private isWalking = false
  private phaseEndsAt = 0
  private started = false
  private homeX = 0
  private homeY = 0

  constructor(
    config: WanderConfig,
    deps: {
      canStandAt: (x: number, y: number) => boolean
      applyFacing: (direction: CardinalDirection) => void
      /** Injectable random source; defaults to Math.random for gameplay. */
      random?: NpcRandomSource
    },
  ) {
    this.config = config
    this.canStandAt = deps.canStandAt
    this.applyFacing = deps.applyFacing
    this.random = deps.random ?? Math.random
  }

  get walking(): boolean {
    return this.isWalking
  }

  get heading(): CardinalDirection {
    return this.direction
  }

  update(npc: Npc, deltaMs: number, now: number, paused: boolean): void {
    if (paused) {
      this.started = false
      this.isWalking = false
      return
    }

    if (!this.started) {
      this.started = true
      this.homeX = npc.sprite.x
      this.homeY = npc.sprite.y
      this.isWalking = false
      this.phaseEndsAt = now + this.randomMs(this.config.minPause, this.config.maxPause)
      return
    }

    if (now >= this.phaseEndsAt) {
      this.isWalking = !this.isWalking
      if (this.isWalking) {
        this.direction = pickOpenDirection(
          Math.floor(npc.sprite.x / NPC_TILE_SIZE),
          Math.floor(npc.sprite.y / NPC_TILE_SIZE),
          this.canStandAt,
          this.random,
        )
        this.phaseEndsAt = now + this.randomMs(this.config.minDuration, this.config.maxDuration)
      } else {
        this.phaseEndsAt = now + this.randomMs(this.config.minPause, this.config.maxPause)
      }
      this.applyFacing(this.direction)
    }

    if (!this.isWalking) return

    const vector = DIRECTION_VECTORS[this.direction]
    const step = (this.config.speed * deltaMs) / 1000
    const targetX = npc.sprite.x + vector.x * step
    const targetY = npc.sprite.y + vector.y * step

    const outsideLeash =
      Math.hypot(targetX - this.homeX, targetY - this.homeY) > this.config.leashRadius
    if (outsideLeash || !this.canStandAt(targetX, targetY)) {
      // Turn around immediately rather than standing until the phase expires,
      // which is what makes a long-roam NPC visibly traverse a road instead of
      // nose-butting a fence for three seconds.
      this.direction = oppositeDirection(this.direction)
      this.applyFacing(this.direction)
      return
    }

    npc.sprite.x = targetX
    npc.sprite.y = targetY
  }

  private randomMs(minSeconds: number, maxSeconds: number): number {
    return (minSeconds + this.random() * (maxSeconds - minSeconds)) * 1000
  }
}

/**
 * A waypoint route for `PatrolAi`, expressed in **tile coordinates** so the
 * content stays readable and is converted to world pixels at use time.
 *
 * Each waypoint must sit on a walkable tile; consecutive waypoints must be
 * connected by straight cardinal segments of walkable tiles (the route is
 * validated lazily by `PatrolAi` refusing to walk blocked segments).
 */
export type NpcRoute = {
  /** Ordered waypoints in tile coordinates, e.g. `[{ x: 1, y: 12 }, …]`. */
  waypoints: ReadonlyArray<{ x: number; y: number }>
  /**
   * Seconds to pause on arriving at each waypoint. One range is used for all
   * waypoints; individual dwell variation comes from the seeded RNG.
   */
  minDwell: number
  maxDwell: number
  /** Delay before this NPC starts its first routine, in seconds. */
  initialDelay?: number
  /** Chance of looking around before leaving a destination. */
  lookAroundChance?: number
}

export type NpcActivityState =
  | 'IDLE'
  | 'WALKING'
  | 'WAITING'
  | 'LOOKING_AROUND'
  | 'RETURNING_HOME'

/**
 * Gated waypoint patrol behaviour.
 *
 * `RoamAi` covers residents who drift around a home anchor. A small number of
 * travellers and explorers should instead *travel between distant map regions*
 * along real connected paths: `PatrolAi` walks the polyline between waypoints
 * one cardinal step at a time, pausing a random dwell at each stop, then loops
 * (ping-pongs back to the first waypoint rather than teleporting).
 *
 * Safety: every step is checked with the same `canStandAt` the player collision
 * rules use; if a step is blocked the patrol waits and retries rather than
 * cutting a corner. Movement is continuous — no teleporting — and, like the
 * other AIs, the seeded RNG makes the whole schedule reproducible in tests.
 */
export class PatrolAi {
  private route: NpcRoute
  private readonly speed: number
  private readonly canStandAt: (x: number, y: number) => boolean
  private readonly isOccupiedAt: (x: number, y: number) => boolean
  private readonly applyFacing: (direction: CardinalDirection) => void
  private readonly random: NpcRandomSource

  private legTarget = { x: 0, y: 0 }
  private legIndex = 1
  private legDirection: 1 | -1 = 1
  private isWalking = false
  private phaseEndsAt = 0
  private started = false
  private path: GridPoint[] | null = null
  private pathIndex = 0
  private activityState: NpcActivityState = 'IDLE'

  constructor(
    route: NpcRoute,
    speed: number,
    deps: {
      canStandAt: (x: number, y: number) => boolean
      isOccupiedAt?: (x: number, y: number) => boolean
      applyFacing: (direction: CardinalDirection) => void
      random?: NpcRandomSource
    },
  ) {
    this.route = route
    this.speed = speed
    this.canStandAt = deps.canStandAt
    this.isOccupiedAt = deps.isOccupiedAt ?? (() => false)
    this.applyFacing = deps.applyFacing
    this.random = deps.random ?? Math.random
  }

  get walking(): boolean {
    return this.isWalking
  }

  get state(): NpcActivityState {
    return this.activityState
  }

  get heading(): CardinalDirection {
    return this.direction
  }

  get debugPath(): readonly GridPoint[] {
    return this.path ?? []
  }

  private get direction(): CardinalDirection {
    const dx = this.legTarget.x * 16 + 8 - this.currentX
    const dy = this.legTarget.y * 16 + 16 - this.currentY
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left'
    return dy > 0 ? 'down' : 'up'
  }

  private currentX = 0
  private currentY = 0

  update(npc: Npc, deltaMs: number, now: number, paused: boolean): void {
    if (paused) {
      this.started = false
      this.isWalking = false
      this.activityState = 'IDLE'
      return
    }

    if (!this.started) {
      this.started = true
      // Validate every route waypoint before the first step: a waypoint that
      // sits on an unsafe tile (building footprint, roof shadow, canopy) would
      // otherwise pull the patrol into it. The route is clamped to the first
      // safe contiguous run of waypoints so a bad authoring entry cannot drag
      // the NPC into excluded art.
      const safeWaypoints = []
      for (const waypoint of this.route.waypoints) {
        const waypointPx = { x: waypoint.x * 16 + 8, y: (waypoint.y + 1) * 16 }
        if (!this.canStandAt(waypointPx.x, waypointPx.y)) break
        safeWaypoints.push(waypoint)
      }
      if (safeWaypoints.length < 2) {
        // Degenerate route: park the NPC on its first waypoint and never walk.
        this.currentX = npc.sprite.x
        this.currentY = npc.sprite.y
        this.legIndex = 0
        this.legDirection = 1
        this.legTarget = { x: npc.sprite.x, y: npc.sprite.y }
        this.isWalking = false
        this.phaseEndsAt = Number.POSITIVE_INFINITY
        return
      }
      this.route = { ...this.route, waypoints: safeWaypoints }
      this.currentX = npc.sprite.x
      this.currentY = npc.sprite.y
      this.legIndex = 1
      this.legDirection = 1
      this.legTarget = { ...this.route.waypoints[this.legIndex] }
      this.path = null
      this.pathIndex = 0
      this.isWalking = false
      this.activityState = 'WAITING'
      this.phaseEndsAt = now + (this.route.initialDelay ?? 0) * 1000 + this.randomDwell()
      return
    }

    if (!this.isWalking) {
      if (now >= this.phaseEndsAt) {
        if (this.activityState === 'WAITING' && this.shouldLookAround()) {
          this.activityState = 'LOOKING_AROUND'
          this.phaseEndsAt = now + this.randomSeconds(1, 3) * 1000
          this.applyFacing(this.direction)
          return
        }
        if (!this.path || !this.calculatePath()) {
          this.activityState = 'WAITING'
          this.phaseEndsAt = now + this.randomDwell()
          return
        }
        this.isWalking = true
        this.activityState = this.legDirection === -1 ? 'RETURNING_HOME' : 'WALKING'
      }
      return
    }

    const step = (this.speed * deltaMs) / 1000
    const path = this.path
    const nextNode = path?.[this.pathIndex]
    if (!path || !nextNode) {
      this.isWalking = false
      this.activityState = 'WAITING'
      this.phaseEndsAt = now + this.randomDwell()
      this.advanceLeg()
      return
    }
    const targetPx = nextNode.x * 16 + 8
    const targetPy = (nextNode.y + 1) * 16
    const dx = targetPx - this.currentX
    const dy = targetPy - this.currentY

    this.applyFacing(this.direction)

    // If the next step would leave walkable ground, wait for a fresh dwell
    // rather than cutting across blocked tiles.
    if (
      dx !== 0 &&
      (!this.canStandAt(this.currentX + Math.sign(dx) * step, this.currentY) ||
        this.isOccupiedAt(this.currentX + Math.sign(dx) * step, this.currentY))
    ) {
      this.isWalking = false
      this.activityState = 'WAITING'
      this.path = null
      this.phaseEndsAt = now + this.randomDwell()
      return
    }
    if (
      dy !== 0 &&
      (!this.canStandAt(this.currentX, this.currentY + Math.sign(dy) * step) ||
        this.isOccupiedAt(this.currentX, this.currentY + Math.sign(dy) * step))
    ) {
      this.isWalking = false
      this.activityState = 'WAITING'
      this.path = null
      this.phaseEndsAt = now + this.randomDwell()
      return
    }

    if (Math.abs(dx) <= step && Math.abs(dy) <= step) {
      // Waypoint reached: snap, dwell, then advance the ping-pong cursor.
      this.currentX = targetPx
      this.currentY = targetPy
      npc.sprite.x = targetPx
      npc.sprite.y = targetPy
      this.pathIndex += 1
      if (this.pathIndex >= path.length) {
        this.isWalking = false
        this.activityState = 'WAITING'
        this.phaseEndsAt = now + this.randomDwell()
        this.advanceLegCursor()
        this.legTarget = { ...this.route.waypoints[this.legIndex] }
        this.path = null
        this.pathIndex = 0
      }
      return
    }

    if (dx !== 0) {
      this.currentX += Math.sign(dx) * step
    } else {
      this.currentY += Math.sign(dy) * step
    }
    npc.sprite.x = this.currentX
    npc.sprite.y = this.currentY
  }

  private calculatePath(): boolean {
    const start = {
      x: Math.floor(this.currentX / NPC_TILE_SIZE),
      y: Math.floor(this.currentY / NPC_TILE_SIZE) - 1,
    }
    const goal = { x: this.legTarget.x, y: this.legTarget.y }
    const path = findGridPath(
      start,
      goal,
      (point) => this.canStandAt(
        point.x * NPC_TILE_SIZE + NPC_TILE_SIZE / 2,
        (point.y + 1) * NPC_TILE_SIZE,
      ) && !this.isOccupiedAt(
        point.x * NPC_TILE_SIZE + NPC_TILE_SIZE / 2,
        (point.y + 1) * NPC_TILE_SIZE,
      ),
      35,
      35,
    )
    this.path = path
    this.pathIndex = 0
    return path !== null
  }

  private advanceLeg(): void {
    this.advanceLegCursor()
    this.legTarget = { ...this.route.waypoints[this.legIndex] }
    this.path = null
    this.pathIndex = 0
  }

  /**
   * Chooses the next leg's target: the next route waypoint along the current
   * ping-pong direction, reversing at the ends so the NPC walks the route
   * continuously instead of teleporting back to the start.
   */
  private advanceLegCursor(): void {
    const waypoints = this.route.waypoints
    const next = this.legIndex + this.legDirection
    if (next >= waypoints.length || next < 0) {
      this.legDirection = (this.legDirection === 1 ? -1 : 1) as 1 | -1
      this.legIndex += this.legDirection
    } else {
      this.legIndex = next
    }
  }

  private randomDwell(): number {
    return (this.route.minDwell + this.random() * (this.route.maxDwell - this.route.minDwell)) * 1000
  }

  private randomSeconds(min: number, max: number): number {
    return min + this.random() * (max - min)
  }

  private shouldLookAround(): boolean {
    return this.random() < (this.route.lookAroundChance ?? 0.35)
  }
}
