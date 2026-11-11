import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ArrayLesson } from './ArrayLesson'
import { challengeStore, registerChallengeSceneBridge } from './challengeStore'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let host: HTMLDivElement | undefined
let root: Root | undefined
let unregisterBridge: (() => void) | undefined

function mount(node: ReactNode): HTMLDivElement {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => root?.render(node))
  return host
}

function challengeStoreBridge(
  calls: Array<{ challengeId: string; completedSuccessfully: boolean }>,
): () => void {
  return registerChallengeSceneBridge({
    pausePlayer: () => undefined,
    resumePlayer: (challengeId, completedSuccessfully) => {
      calls.push({ challengeId, completedSuccessfully })
    },
  })
}

function click(container: HTMLElement, selector: string): void {
  const button = container.querySelector<HTMLButtonElement>(selector)
  if (!button) throw new Error(`Button not found: ${selector}`)
  act(() => button.click())
}

beforeEach(() => {
  unregisterBridge?.()
  unregisterBridge = undefined
  challengeStore.closeChallenge(false)
  localStorage.clear()
})

afterEach(() => {
  if (root) act(() => root?.unmount())
  host?.remove()
  root = undefined
  host = undefined
  unregisterBridge?.()
  unreg¶»§q«^