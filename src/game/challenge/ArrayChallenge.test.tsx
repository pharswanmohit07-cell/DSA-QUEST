import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ArrayChallenge } from './ArrayChallenge'
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

function click(container: HTMLElement, selector: string): void {
  const button = container.querySelector<HTMLButtonElement>(selector)
  if (!button) throw new Error(`Button not found: ${selector}`)
  act(() => button.click())
}

function enterNumber(container: HTMLElement, value: string): void {
  const input = container.querySelector<HTMLInputElement>('[data-testid="stack-push-value"]')
  if (!input) throw new Error('Stack value input not found')
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  act(() => {
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

beforeEach(() => challengeStore.closeChallenge(false))
afterEach(() => {
  if (root) act(() => root?.unmount())
  host?.remove()
  root = undefined
  host = undefined
  challengeStore.closeChallenge(false)
  unregisterBridge?.()
  unregisterBridge = undefined
})

describe('Old Man gate puzzle UI', () => {
  it('shows a Main Gate Opened popup after the target stack sequence is solved', () => {
    const resumeCalls: Array<{ challengeId: string; completedSuccessfully: boolean }> = []
    unregisterBridge = registerChallengeSceneBridge({
      pausePlayer: () => undefined,
      resumePlayer: (challengeId, completedSuccessfully) => resumeCalls.push({ challengeId, completedSuccessfully }),
    })
    challengeStore.openChallenge('array-stack-operations', [
      { type: 'push', value: 5 },
      { type: 'push', value: 8 },
      { type: 'pop' },
      { type: 'push', value: 3 },
    ])
    const container = mount(<ArrayChallenge />)

    for (const value of ['5', '8']) {
      enterNumber(container, value)
      click(container, '[data-testid="stack-push"]')
    }
    click(container, '[data-testid="stack-pop"]')
    enterNumber(container, '3')
    click(container, '[data-testid="stack-push"]')

    expect(container.querySelector('[data-testid="gate-opened-popup"]')?.textContent)
      .toContain('VILLAGE GATE OPENED')
    expect(container.querySelector('[data-testid="gate-opened-popup"]')?.textContent)
      .not.toContain('ACHIEVEMENT UNLOCKED')
    expect(container.querySelector('[data-testid="gate-opened-popup"]')?.textContent)
      .not.toContain('QUEST MILESTONE')
    expect(container.querySelector('[data-testid="gate-achievement-medal"]')).toBeNull()
    expect(container.textContent).not.toContain('Continue to implementation')
    expect(container.textContent).not.toContain('TRIAL COMPLETE')

    click(container, '[data-testid="challenge-continue"]')
    expect(resumeCalls).toEqual([
      { challengeId: 'array-stack-operations', completedSuccessfully: true },
    ])
  })
})
