import Phaser from 'phaser'
import type { DialogueTree } from '../dialogue/dialogueTypes'
import type { CardinalDirection } from './WanderAi'

/** How far the player must be from an NPC, in world pixels, to talk to them. */
export const INTERACT_RADIUS = 48

/**
 * Depth offset for Y-sorting, matched to `MainScene`'s `CHARACTER_DEPTH_BASE`.
 * Kept here so an NPC sorts on the same scale as the player and the tilemap.
 */
const CHARACTER_DEPTH_BASE = 100

export type NpcOptions = {
  id: string
  name: string
  /** Texture key of the loaded NPC spritesheet. */
  spriteKey: string
  /** Spawn position in world pixels (tile coordinate * tile size). */
  x: number
  y: number
  dialogueTree: DialogueTree
  /** Idle animation key; defaults to `idle-down`. */
  idleAnimation?: string
  /**
   * URL of the portrait shown beside the speaker's name in the dialogue box.
   * NPCs without one simply show no portrait.
   */
  portraitUrl?: string
  /**
   * Tint applied to the NPC sprite. Used to visually distinguish NPCs that
   * currently reuse the same character art, since the asset pack only ships
   * the player character.
   */
  tint?: number
}

/**
 * A village NPC.
 *
 * NPCs are static, Y-sorted sprites that own a small circular interaction zone.
 * The zone is a plain distance check rather than a physics body: an NPC must
 * never push the player around, it only needs to report "am I in range".
 *
 * Depth is driven from the sprite's Y every frame so the player walks in front
 * of NPCs standing further up the map and behind NPCs standing further down,
 * matching the tilemap's own Y-sorting convention.
 */
export class Npc {
  readonly id: string
  readonly name: string
  readonly dialogueTree: DialogueTree
  readonly sprite: Phaser.GameObjects.Sprite
  readonly thoughtBubbleSprite: Phaser.GameObjects.Sprite | null
  /**
   * URL of the dialogue portrait, or `null` if this NPC has none. Stored as a
   * URL because the React overlay renders it as a DOM `<img>`, not as a Phaser
   * texture; the scene registers the same file under a texture key separately.
   */
  readonly portraitUrl: string | null

  private readonly interactionRadius: number
  private readonly scene: Phaser.Scene
  /** Key prefix for this NPC's animations, e.g. `elder-anim`. */
  private readonly animationPrefix: string | null

  constructor(scene: Phaser.Scene, options: NpcOptions) {
    this.scene = scene
    this.id = options.id
    this.name = options.name
    this.dialogueTree = options.dialogueTree
    this.portraitUrl = options.portraitUrl ?? null
    this.interactionRadius = INTERACT_RADIUS
    // Derived from the idle key: `elder-anim-idle-down` -> `elder-anim`.
    this.animationPrefix =
      options.idleAnimation?.replace(/-idle-(down|up|left|right)$/, '') ?? null

    this.sprite = scene.add.sprite(options.x, options.y, options.spriteKey, 0)
    this.sprite.setOrigin(0.5, 1)
    this.sprite.setData('npcId', options.id)
    this.thoughtBubbleSprite = scene.anims.exists('elder-thought-bubble')
      ? scene.add
          .sprite(options.x, options.y - 28, 'ui-dialog-info')
          .play('elder-thought-bubble')
          .setDisplaySize(20, 16)
          .setDepth(9000)
          .setVisible(false)
      : null

    if (options.tint !== undefined) {
      this.sprite.setTint(options.tint)
    }

    const idleAnimation = options.idleAnimation ?? 'idle-down'
    if (scene.anims.exists(idleAnimation)) {
      this.sprite.play(idleAnimation)
    }

    // Seed the depth immediately so an NPC added after the first update tick
    // still sorts correctly on its very first rendered frame.
    this.sprite.setDepth(CHARACTER_DEPTH_BASE + options.y)
  }

  /** Keeps this NPC Y-sorted relative to the player and other NPCs. */
  update(): void {
    this.sprite.setDepth(CHARACTER_DEPTH_BASE + this.sprite.y)
    this.thoughtBubbleSprite
      ?.setPosition(this.sprite.x, this.sprite.y - 28)
      .setDepth(9000)
  }

  setThoughtBubbleVisible(visible: boolean): void {
    this.thoughtBubbleSprite?.setVisible(visible)
  }

  /**
   * Stops all motion and points the sprite at a target.
   *
   * Used when the player starts a conversation: an NPC that kept walking (or
   * kept facing the heading it happened to be walking) looks wrong while
   * talking. The NPC has no physics body, so "stopping" is purely about the
   * animation; the wander AI is suspended separately.
   */
  faceTowards(targetX: number, targetY: number): void {
    this.sprite.anims.stop()
    const dx = targetX - this.sprite.x
    const dy = targetY - this.sprite.y
    // Resolve the horizontal axis first so a purely vertical offset still
    // picks up/down rather than falling through to a default.
    if (Math.abs(dx) > Math.abs(dy)) {
      this.setFacing(dx > 0 ? 'right' : 'left')
    } else {
      this.setFacing(dy > 0 ? 'down' : 'up')
    }
  }

  private setFacing(direction: CardinalDirection): void {
    const key = `${this.animationPrefix}-idle-${direction}`
    if (this.animationPrefix && this.scene.anims.exists(key)) {
      this.sprite.play(key, true)
    }
  }

  /** True when the player is close enough to start a conversation. */
  isInRange(playerX: number, playerY: number): boolean {
    // Compare against the NPC's feet rather than its centre, which matches how
    // the player sees "standing next to" the character.
    const dx = playerX - this.sprite.x
    const dy = playerY - this.sprite.y
    return Math.hypot(dx, dy) <= this.interactionRadius
  }

  /** The node a conversation should start on. */
  get startNodeId(): string {
    return Object.keys(this.dialogueTree)[0] ?? ''
  }

  destroy(): void {
    this.thoughtBubbleSprite?.destroy()
    this.sprite.destroy()
  }
}
