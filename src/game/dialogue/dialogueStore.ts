import { useSyncExternalStore } from 'react'
import type { DialogueViewState } from './dialogueTypes'

/**
 * Minimal bridge between the Phaser scene (which owns the conversation logic)
 * and the React overlay (which only renders it).
 *
 * A tiny external store is used rather than lifting dialogue state into React
 * because the scene updates at frame rate while typing, and the scene must be
 * able to open and close the conversation without any React involvement.
 * `useSyncExternalStore` keeps the two in step without a re-render storm.
 */

type Listener = () => void

let currentState: DialogueViewState | null = null
const listeners = new Set<Listener>()

function emit() {
  for (const listener of [...listeners]) {
    listener()
  }
}

/** Publish a new dialogue state. Pass `null` to close the box. */
export function setDialogueState(next: DialogueViewState | null): void {
  if (next === currentState) {
    return
  }
  currentState = next
  emit()
}

export function getDialogueState(): DialogueViewState | null {
  return currentState
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Subscribe a component to the current conversation. */
export function useDialogueState(): DialogueViewState | null {
  return useSyncExternalStore(subscribe, getDialogueState, getDialogueState)
}
