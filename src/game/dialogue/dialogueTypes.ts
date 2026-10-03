/**
 * Dialogue data model.
 *
 * A dialogue is a flat map of nodes keyed by id. Each node renders one block of
 * text under a speaker's name, and either ends the conversation (`next: null`)
 * or moves to another node. A node may also offer branching responses, in which
 * case the player picks a `choice` and the picked option's `next` is taken.
 *
 * Nodes are data-only so they can be authored in plain JSON-ish literals inside
 * `villageNpcs.ts` without pulling scene or Phaser types into the content file.
 */

export type DialogueChoice = {
  /** Text shown on the button. */
  text: string
  /** Node to continue to once this option is picked. */
  next: string
}

export type ArrayLessonVisual =
  | {
      kind: 'array'
      values: number[]
      showIndices?: boolean
      highlightIndex?: number
      annotation?: string
    }
  | {
      kind: 'insertion'
      before: number[]
      after: Array<number | string>
      insertIndex: number
    }
  | {
      kind: 'recap'
    }

export type DialogueNode = {
  /** Who is speaking. Drives the name tag above the box. */
  speaker: string
  /** Body text, revealed progressively by the typewriter. */
  text: string
  /** Uses the expanded teaching layout with an interactive-style diagram. */
  lessonMode?: boolean
  lessonVisual?: ArrayLessonVisual
  /**
   * Node to advance to. `null` ends the conversation and closes the box.
   * Ignored when `choices` is present.
   */
  next: string | null
  /**
   * Optional branching responses. When present the box shows buttons and does
   * not auto-advance, so the player must pick one.
   */
  choices?: DialogueChoice[]
}

export type DialogueTree = Record<string, DialogueNode>

/** State handed to the UI layer every time the conversation changes. */
export type DialogueViewState = {
  /** The NPC currently being talked to. */
  npcId: string
  npcName: string
  /**
   * URL of the NPC's portrait, or `null` when it has none. This is a URL rather
   * than a Phaser texture key because the overlay renders it as a DOM `<img>`.
   */
  portraitUrl: string | null
  /** The node being displayed. */
  nodeId: string
  speaker: string
  text: string
  lessonMode: boolean
  lessonVisual: ArrayLessonVisual | null
  choices: DialogueChoice[]
  /**
   * How much of `text` the typewriter has revealed so far, as a character
   * count. Equal to `text.length` once typing finishes.
   */
  revealed: number
}
