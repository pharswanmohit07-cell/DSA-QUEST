import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DialogueBox } from './DialogueBox'
import { setDialogueState } from './dialogueStore'
import type { DialogueViewState } from './dialogueTypes'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const initialDialogue: DialogueViewState = {
  npcId: 'elder-masanori',
  npcName: 'Old Man',
  portraitUrl: null,
  nodeId: 'start',
  speaker: 'Old Man',
  text: 'The village gate has stood closed for years.',
  lessonMode: false,
  lessonVisual: null,
  choices: [],
  revealed: 43,
}

let host: HTMLDivElement | undefined
let root: Root | undefined
let pendingFrames: FrameRequestCallback[] = []
let frameId = 0

function mountDialogue(getAnchorPosition: (npcId: string) => { x: number; y: number } | null) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => {
    root?.render(
      <DialogueBox
        getAnchorPosition={getAnchorPosition}
        onChoose={() => undefined}
        onAdvance={() => undefined}
        onClose={() => undefined}
      />,
    )
  })
  return host
}

function flushAnimationFrames() {
  const callbacks = pendingFrames
  pendingFrames = []
  act(() => {
    callbacks.forEach((callback) => callback(0))
  })
}

beforeEach(() => {
  setDialogueState(null)
  pendingFrames = []
  frameId = 0
  Object.defineProperty(window, 'requestAnimationFrame', {
    configurable: true,
    value: (callback: FrameRequestCallback) => {
      pendingFrames.push(callback)
      frameId += 1
      return frameId
    },
  })
  Object.defineProperty(window, 'cancelAnimationFrame', {
    configurable: true,
    value: () => undefined,
  })
})

afterEach(() => {
  if (root) act(() => root?.unmount())
  host?.remove()
  root = undefined
  host = undefined
  setDialogueState(null)
  pendingFrames = []
  delete (window as Partial<Window>).requestAnimationFrame
  delete (window as Partial<Window>).cancelAnimationFrame
})

describe('NPC dialogue anchor lifecycle', () => {
  it('re-anchors the bubble when the same NPC advances to another dialogue node', () => {
    const getAnchorPosition = vi.fn(() => ({ x: 420, y: 280 }))
    act(() => setDialogueState(initialDialogue))
    const container = mountDialogue(getAnchorPosition)

    flushAnimationFrames()
    expect(container.querySelector('[data-testid="dialogue-box"]')?.getAttribute('data-anchor-ready'))
      .toBe('true')
    expect(getAnchorPosition).toHaveBeenCalledTimes(1)

    act(() => {
      setDialogueState({
        ...initialDialogue,
        nodeId: 'quest_done',
        text: 'The gate is open. The Village Guide holds the next lesson.',
        revealed: 57,
      })
    })

    flushAnimationFrames()

    expect(container.querySelector('[data-testid="dialogue-box"]')?.getAttribute('data-anchor-ready'))
      .toBe('true')
    expect(getAnchorPosition).toHaveBeenCalledTimes(2)
  })
  it('pages long NPC dialogue and renders choices below the artwork-backed bubble', () => {
    const longText = 'Beyond the gate, seven guardians protect fragments of forgotten knowledge. Find each guardian and learn what they keep. Some rewards are not what they first appear.'
    act(() => setDialogueState({
      ...initialDialogue,
      text: longText,
      choices: [{ text: 'I will return another time.', next: 'later' }],
    }))
    const container = mountDialogue(() => ({ x: 420, y: 280 }))

    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })))
    expect(container.querySelector('[data-testid="dialogue-page-indicator"]')?.textContent).toBe('1 / 2')

    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })))
    expect(container.querySelector('[data-testid="dialogue-page-indicator"]')?.textContent).toBe('2 / 2')
    expect(container.querySelector('[data-testid="dialogue-choices"]')).toBeNull()

    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })))
    const bubble = container.querySelector('[data-testid="dialogue-bubble"]')
    const choices = container.querySelector('[data-testid="dialogue-choices"]')
    expect(choices).not.toBeNull()
    expect(bubble?.contains(choices)).toBe(false)
  })

})
