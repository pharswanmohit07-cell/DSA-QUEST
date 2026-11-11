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
  unregisterBridge = undefined
  challengeStore.closeChallenge(false)
  localStorage.clear()
})

describe('Elder ArrayLesson panel lifecycle', () => {
  it('restarts at the first panel after an interrupted lesson is reopened', () => {
    const container = mount(<ArrayLesson />)

    act(() => challengeStore.openArrayLesson())
    expect(container.querySelector('h2')?.textContent).toBe('What is an array?')

    for (let index = 0; index < 5; index += 1) {
      click(container, '[data-testid="lesson-next"]')
    }
    expect(container.querySelector('h2')?.textContent).toBe('Recap')

    act(() => challengeStore.closeChallenge(false))
    expect(container.querySelector('[data-testid="lesson-overlay"]')).toBeNull()

    act(() => challengeStore.openArrayLesson())
    expect(container.querySelector('h2')?.textContent).toBe('What is an array?')
    expect(container.querySelector('.lesson-progress')?.textContent).toBe('1 / 6')
  })

  it('uses beginner-friendly examples and visible recap cards', () => {
    const container = mount(<ArrayLesson />)
    act(() => challengeStore.openArrayLesson())

    expect(container.querySelector('.lesson-example')?.textContent)
      .toContain('Think of an array as a row of numbered boxes')
    expect(container.textContent).toContain('one variable')
    expect(container.querySelectorAll('.lesson-box').length).toBe(5)

    for (let index = 0; index < 5; index += 1) {
      click(container, '[data-testid="lesson-next"]')
    }

    expect(container.querySelectorAll('.lesson-recap-item').length).toBe(3)
    expect(container.querySelectorAll('.lesson-recap-mark').length).toBe(3)
    expect(container.querySelector('.lesson-recap')?.textContent)
      .toContain('The first item is at index 0')
  })

  it('closes successfully only after the final lesson panel is acknowledged', () => {
    const resumeCalls: Array<{ challengeId: string; completedSuccessfully: boolean }> = []
    unregisterBridge = challengeStoreBridge(resumeCalls)
    const container = mount(<ArrayLesson />)

    act(() => challengeStore.openArrayLesson())
    for (let index = 0; index < 5; index += 1) {
      click(container, '[data-testid=lesson-next]')
    }
    expect(container.querySelector('h2')?.textContent).toBe('Recap')

    click(container, '[data-testid=lesson-complete]')

    expect(challengeStore.getSnapshot().activeChallenge).toBeNull()
    expect(resumeCalls).toEqual([
      { challengeId: 'array-lesson', completedSuccessfully: true },
    ])
    unregisterBridge?.()
    unregisterBridge = undefined
  })

})
