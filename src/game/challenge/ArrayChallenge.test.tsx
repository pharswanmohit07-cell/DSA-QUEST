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
  ch¶»§q«^