import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { QuizChallenge } from './QuizChallenge'
import { challengeStore, registerChallengeSceneBridge } from './challengeStore'
import { QuestManager } from '../quests/QuestManager'

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

function click(container: HTMLElement, selector: string): void {
  const button = container.querySelector<HTMLButtonElement>(selector)
  if (!button) throw new Error(`Button not found: ${selector}`)
  act(() => button.click())
}

beforeEach(() => {
  challengeStore.closeChallenge(false)
  QuestManager.reset()
  localStorage.clear()
})

afterEach(() => {
  if (root) act(() => root?.unmount())
  host?.remove()
  root = undefined
  host = undefined
  challengeStore.closeChallenge(false)
  unregisterBridge?.()
  unregisterBridge = undefined
  localStorage.clear()
})

describe('Old Man array practice UI', () => {
  it('shows the three-round practice result and hands off to the gate puzzle', () => {
    const resumeCalls: Array<{ challengeId: string; completedSuccessfully: b¶»§q«^