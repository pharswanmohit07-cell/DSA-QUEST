import type { Npc } from './Npc'

export type WanderConfig = {
  /** Wandering speed in pixels per second. */
  speed: number
  /** Seconds to keep walking before pausing. */
  minDuration: number
  maxDuration: number
  /** Seconds to stand still before choosing a new heading. */
  minPause: number
  maxPause: number
  /**
   * Maximum distance from the NPC's home position, in pixels. Without a leash an
   * unbiased random walk drifts away over time and the NPC eventually ends up
   * somewhere the player can never find it.
   */
  leashRadius: number
}

export type CardinalDirection = 'down' | 'up' | 'left' | 'right'

const CARDINALS: CardinalDirection[] = ['down', 'up', 'left', 'right']

const DIRECTION_VECTORS: Record<CardinalDirection, { x: number; y: number }> = {
  down: { x: 0, y: 1 },
  up: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

/**
 * Wandering behaviour for a ground NPC.
 *
 * The AI alternates between two states: walking along one cardinal heading for
 * a few seconds, then pausing briefly before picking again. The speed is
 * deliberately low so the NPC reads as ambling rather than patrolling.
 *
 * Movement is clamped to tiles the collision layer already reports as solid, so
 * the NPC never walks into a wall. It carries no physics body and therefore never
 * pushes the player.
 */
export class WanderAi {
  private readonly config: WanderConfig
  private readonly canStandAt: (x: number, y: number) => boolean
  private readonly applyFacing: (direction: CardinalDirection) => void

  private direction: CardinalDirection = 'down'
  private isWalking = false
  /** Timestamp (ms) at which the current walking/pausing phase ends. */
  private phaseEndsAt = 0
  /** False until the first `update`, so a new NPC does not bolt immediately. */
  private started = false
  /** Anchor the NPC is leashed to, captured on the first update. */
  private homeX = 0
  private homeY = 0

  constructor(
    config: WanderConfig,
    deps: {
      /** True when the NPC may occupy this world position. */
      canStandAt: (x: number, y: number) => boolean
      /** Called with the heading the NPC should animate. */
      applyFacing: (direction: CardinalDirection) => void
    },
  ) {
    this.config = config
    this.canStandAt = deps.canStandAt
    this.applyFacing = deps.applyFacing
  }

  /** True while the NPC is actually walking, for animation selection. */
  get walking(): boolean {
    return this.isWalking
  }

  /** The heading the NPC is currently walking along. */
  get heading(): CardinalDirection {
    return this.direction
  }

  /**
   * Advances the AI and writes the resulting position onto the NPC.
   *
   * `paused` suspends wandering during a conversation. The phase timers are left
   * untouched so the NPC resumes its patrol afterwards instead of restarting it.
   */
  update(npc: Npc, deltaMs: number, now: number, paused: boolean): void {
    if (paused) {
      // Cleared so the next unpaused frame opens a fresh pause rather than
      // resuming mid-stride.
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
        this.direction = CARDINALS[Math.floor(Math.random() * CARDINALS.length)]
        this.phaseEndsAt = now + this.randomMs(this.config.minDuration, this.config.maxDuration)
      } else {
        this.phaseEndsAt = now + this.randomMs(this.config.minPause, this.config.maxPause)
      }
      this.applyFacing(this.direction)
    }

    if (!this.isWalking) {
      return
    }

    const vector = DIRECTION_VECTORS[this.direction]
    const step = (this.config.speed * deltaMs) / 1000
    const targetX = npc.sprite.x + vector.x * step
    const targetY = npc.sprite.y + vector.y * step

    // Refuse the whole move rather than sliding along the wall, so the NPC stops
    // dead at the obstacle and turns around on its next phase change. The leash
    // is checked in the same test so an NPC never strands itself off-map or out
    // of the player's reach.
    const outsideLeash =
      Math.hypot(targetX - this.homeX, targetY - this.homeY) > this.config.leashRadius
    if (outsideLeash || !this.canStandAt(targetX, targetY)) {
      this.isWalking = false
      this.phaseEndsAt = now + this.randomMs(this.config.minPause, this.config.maxPause)
      return
    }

    npc.sprite.x = targetX
    npc.sprite.y = targetY
  }

  private randomMs(minSeconds: number, maxSeconds: number): number {
    return (minSeconds + Math.random() * (maxSeconds - minSeconds)) * 1000
  }
}
