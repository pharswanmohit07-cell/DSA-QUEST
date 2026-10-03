import type { DialogueTree } from '../dialogue/dialogueTypes'
import elderPortraitUrl from '../../assets/tiles/ninja-village/Elder/Faceset.png'

/**
 * Village NPC dialogue.
 *
 * Spawn positions are given in tile coordinates and converted to world pixels
 * by the caller. The position was chosen from the map's own walkable data so the
 * NPC can never spawn inside a wall or seal a passage:
 *
 * - Elder Hiro stands at (6, 27), at the foot of the south-west staircase in
 *   front of the dojo. That tile is walkable in the map data, and he wanders
 *   only along tiles the collision layer already marks as free.
 *
 * He is the only NPC. A previous Merchant entry borrowed the Hunter spritesheet
 * and sat near the gate; it was removed because a second stationary NPC there
 * crowded the only approach to the torii gate.
 */

export type NpcDefinition = {
  id: string
  name: string
  tileX: number
  tileY: number
  /** Phaser texture key of the NPC's idle spritesheet. */
  spriteKey: string
  /** Phaser animation key played while the NPC stands still. */
  idleAnimation: string
  /**
   * Phaser texture key of the walking spritesheet. Omit for NPCs that do not
   * wander; `WanderAi` will not move an NPC without one.
   */
  walkSpriteKey?: string
  /** Animation key prefix for the walk cycle; the facing is appended. */
  walkAnimationPrefix?: string
  /**
   * URL of the portrait shown in the dialogue box. The scene registers it with
   * Phaser and also passes the URL through to the DOM overlay, which needs a
   * real `src` rather than a texture key.
   */
  portraitUrl?: string
  /**
   * Tint applied to the sprite. Omit entirely to leave the art untinted, which
   * is what NPCs with real art of their own should do.
   */
  tint?: number
  /** Wander behaviour; omit to keep the NPC stationary. */
  wander?: {
    /** Wandering speed in pixels per second. */
    speed: number
    /** Seconds to wander before pausing. */
    minDuration: number
    maxDuration: number
    /** Seconds to stand still before picking a new direction. */
    minPause: number
    maxPause: number
    /**
     * Maximum distance from home, in pixels. Bounds the random walk so the NPC
     * always stays reachable.
     */
    leashRadius: number
  }
  dialogueTree: DialogueTree
}

const ELDER_TREE: DialogueTree = {
  start: {
    speaker: 'Old Man',
    text: 'Another seeker? Good. The dojo has been quiet since the last trial, and quiet is when the real lessons begin.',
    next: 'choices',
  },
  choices: {
    speaker: 'Old Man',
    text: 'So. What brings a hunter to the village?',
    next: null,
    choices: [
      { text: 'Teach me about the arrays.', next: 'arrays' },
      { text: 'I am only passing through.', next: 'passing' },
    ],
  },
  arrays: {
    speaker: 'Old Man',
    text: 'An array is a row of boxes, lined up side by side, each holding one value.',
    lessonMode: true,
    lessonVisual: { kind: 'array', values: [10, 20, 30, 40, 50] },
    next: 'array_index',
  },
  array_index: {
    speaker: 'Old Man',
    text: 'Each box has a position number called an index. Counting starts at 0, not 1. So the box at index 0 holds 10, and the box at index 2 holds 30.',
    lessonMode: true,
    lessonVisual: { kind: 'array', values: [10, 20, 30, 40, 50], showIndices: true },
    next: 'array_access',
  },
  array_access: {
    speaker: 'Old Man',
    text: "Here's the powerful part: if you know the index, you can jump straight to that box instantly — you don't need to check the others first. We call this O(1) time, meaning constant time, no matter how big the array is.",
    lessonMode: true,
    lessonVisual: {
      kind: 'array',
      values: [10, 20, 30, 40, 50],
      showIndices: true,
      highlightIndex: 2,
      annotation: 'array[2] → 30',
    },
    next: 'array_insert',
  },
  array_insert: {
    speaker: 'Old Man',
    text: 'But inserting a new value at index 1 is slower. Every box from that point onward must shift one space right to make room. This takes O(n) time — the more boxes there are, the more shifting is needed.',
    lessonMode: true,
    lessonVisual: {
      kind: 'insertion',
      before: [10, 20, 30, 40, 50],
      after: [10, 'NEW', 20, 30, 40, 50],
      insertIndex: 1,
    },
    next: 'array_recap',
  },
  array_recap: {
    speaker: 'Old Man',
    text: "Let's recap: an array's index starts at 0. Reading a value by index is instant: O(1). Inserting in the middle is slower: O(n), because later values must shift. Ready? I'll ask you a few questions to check your understanding.",
    lessonMode: true,
    lessonVisual: { kind: 'recap' },
    next: 'quest_offer',
  },
  /**
   * Hands out the challenge. The branch is taken only while the quest is still
   * active, so the Elder does not repeat himself once it is done; the `done`
   * node covers that case.
   */
  quest_offer: {
    speaker: 'Old Man',
    text: "Let's see if you've got it. I'll ask you three questions — answer wrong three times and you'll need to come back and try again.",
    next: null,
    choices: [
      { text: 'I am ready for the quiz', next: 'quest_accept' },
      { text: 'Not yet.', next: 'quest_later' },
    ],
  },
  quest_later: {
    speaker: 'Old Man',
    text: 'The gate will keep. Come back when you are ready to think.',
    next: null,
  },
  quest_done: {
    speaker: 'Old Man',
    text: 'The ward is down and the snowfield is open. Walk north, hunter, and do not waste the lesson.',
    next: null,
  },
  quest_accept: {
    speaker: 'Old Man',
    text: 'First, show me what you learned. Then we will put it into practice with a stack.',
    next: null,
  },
  passing: {
    speaker: 'Old Man',
    text: 'Then walk well. The gate behind you is open, and the snow does not wait for anyone.',
    next: null,
  },
}

export const VILLAGE_NPCS: readonly NpcDefinition[] = [
  {
    id: 'elder-masanori',
    name: 'Old Man',
    tileX: 6,
    tileY: 27,
    spriteKey: 'elder-idle',
    idleAnimation: 'elder-anim-idle-down',
    walkSpriteKey: 'elder-walk',
    walkAnimationPrefix: 'elder-anim-walk',
    portraitUrl: elderPortraitUrl,
    // Real Elder art, so no tint is applied.
    wander: {
      speed: 30,
      minDuration: 3,
      maxDuration: 5,
      minPause: 1.2,
      maxPause: 3,
      // Three tiles: enough to pace in front of the dojo, tight enough that he
      // is always within a few seconds' walk of his post.
      leashRadius: 48,
    },
    dialogueTree: ELDER_TREE,
  },
]
