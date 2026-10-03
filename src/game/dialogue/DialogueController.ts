import { setDialogueState } from './dialogueStore'
import type { DialogueNode, DialogueTree } from './dialogueTypes'
import type { Npc } from '../npc/Npc'

/**
 * Owns a single conversation: which node is showing, and how it advances.
 *
 * The scene keeps the controller rather than React, because the conversation
 * has to keep working (and to keep freezing the player) even if the overlay
 * component is not mounted.
 */

/**
 * Minimum time between two accepted "advance" inputs.
 *
 * The advance key is also the key that opened the conversation, so a player who
 * holds it down would otherwise blow straight through the first line. This
 * debounce turns that into one deliberate advance per press.
 */
const ADVANCE_COOLDOWN_MS = 220

/**
 * The opening press of a key is accepted immediately, and only later presses are
 * debounced.
 *
 * The scene consumes the very press that opened the box, so its timestamp
 * arrives as the "previous" press on the next accepted input. Comparing against
 * that instead of against a fixed wall-clock window means a player who pauses
 * to read a line is never blocked from continuing.
 */
export class DialogueController {
  private npc: Npc | null = null
  private tree: DialogueTree | null = null
  private nodeId = ''
  private lastAdvanceAt = Number.NEGATIVE_INFINITY
  /**
   * Branch ids already taken, kept across conversations.
   *
   * The Elder must not offer the challenge twice, but the player can talk to him
   * again afterwards. Persisting the consumed branches lets the scene route a
   * repeat visit to the "already done" node instead of re-opening the modal.
   */
  private readonly consumedBranches = new Set<string>()

  get isOpen(): boolean {
    return this.npc !== null
  }

  /** The NPC currently being talked to, or `null` when the box is closed. */
  get activeNpc(): Npc | null {
    return this.npc
  }

  /** Opens a conversation at its default first node. */
  start(npc: Npc): void {
    this.begin(npc, npc.startNodeId)
  }

  /**
   * Opens a conversation at a specific node.
   *
   * Used when quest progress changes what the NPC should say next, so the
   * content file does not have to encode quest state in its node ordering.
   */
  startAt(npc: Npc, nodeId: string): void {
    this.begin(npc, nodeId in npc.dialogueTree ? nodeId : npc.startNodeId)
  }

  private begin(npc: Npc, nodeId: string) {
    this.npc = npc
    this.tree = npc.dialogueTree
    this.nodeId = nodeId
    // Nothing consumed yet, so the first advance after opening is not
    // debounced against the press that opened the conversation.
    this.lastAdvanceAt = Number.NEGATIVE_INFINITY
    this.publish()
  }

  /**
   * Handles the advance input. Ignored while a node is still being typed out
   * or while a node is waiting on a choice, so the player cannot skip past
   * content. Returns true when the input was consumed.
   */
  tryAdvance(now: number): boolean {
    if (!this.isOpen) {
      return false
    }
    const node = this.currentNode
    if (!node || (node.choices?.length ?? 0) > 0) {
      return false
    }
    if (now - this.lastAdvanceAt < ADVANCE_COOLDOWN_MS) {
      return false
    }
    this.lastAdvanceAt = now
    this.goto(node.next)
    return true
  }

  /**
   * Follows a branch chosen from the UI.
   *
   * This is where dialogue nodes can have a side effect on the world. Choosing
   * `quest_accept` opens the stack-operations challenge, which closes the dialogue and
   * freezes the player; the branch is consumed once so the same node cannot be
   * re-entered on a later conversation.
   */
  choose(nextNodeId: string): void {
    if (!this.isOpen) {
      return
    }
    this.consumedBranches.add(nextNodeId)
    this.goto(nextNodeId)
  }

  /** True when this branch has already been taken in an earlier conversation. */
  hasConsumed(nodeId: string): boolean {
    return this.consumedBranches.has(nodeId)
  }

  close(): void {
    this.npc = null
    this.tree = null
    this.nodeId = ''
    this.lastAdvanceAt = Number.NEGATIVE_INFINITY
    setDialogueState(null)
  }

  private get currentNode(): DialogueNode | null {
    if (!this.tree) {
      return null
    }
    return this.tree[this.nodeId] ?? null
  }

  private goto(nodeId: string | null): void {
    if (!this.npc || !this.tree) {
      return
    }
    if (nodeId === null || !(nodeId in this.tree)) {
      // A dangling or terminal `next` ends the conversation rather than
      // leaving the player stuck in an empty box.
      this.close()
      return
    }
    this.nodeId = nodeId
    this.publish()
  }

  /**
   * Pushes the current node to the UI.
   *
   * `revealed` is always the full length: the typewriter itself is owned by the
   * overlay, which reveals characters on a timer. The scene stays the single
   * source of truth for *which* node is active.
   */
  private publish(): void {
    const node = this.currentNode
    if (!node || !this.npc) {
      this.close()
      return
    }
    setDialogueState({
      npcId: this.npc.id,
      npcName: this.npc.name,
      portraitUrl: this.npc.portraitUrl,
      nodeId: this.nodeId,
      speaker: node.speaker,
      text: node.text,
      lessonMode: node.lessonMode ?? false,
      lessonVisual: node.lessonVisual ?? null,
      choices: node.choices ?? [],
      revealed: node.text.length,
    })
  }
}

/** Convenience helper: the first NPC in range, or `null`. */
export function isNpcNearby(npcs: readonly Npc[], x: number, y: number): Npc | null {
  return npcs.find((npc) => npc.isInRange(x, y)) ?? null
}
