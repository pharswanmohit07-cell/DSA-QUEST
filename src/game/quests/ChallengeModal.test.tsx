import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChallengeModal } from './ChallengeModal'
import { QuestManager } from './QuestManager'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let host: HTMLDivElement | undefined
let root: Root | undefined

function mount(node: ReactNode): HTMLDivElement {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => root?.render(node))
  return host
}

function click(container: HTMLElement, selector: string): void {
  const element = container.querySelector<HTMLButtonElement | HTMLInputElement>(selector)
  if (!element) throw new Error(`Control not found: ${selector}`)
  act(() => element.click())
}

function setTextareaValue(textarea: HTMLTextAreaElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  if (!setter) throw new Error('Textarea value setter is unavailable')
  act(() => {
    setter.call(textarea, value)
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

beforeEach(() => {
  QuestManager.closeChallenge()
  QuestManager.reset()
  localStorage.clear()
})

afterEach(() => {
  if (root) act(() => root?.unmount())
  host?.remove()
  root = undefined
  host = undefined
  QuestManager.closeChallenge()
  localStorage.clear()
})

describe('Elder implementation challenge UI', () => {
  it('reports a successful array solution once and delegates closing to the scene', () => {
    const onSolved = vi.fn()
    const onClose = vi.fn(() => QuestManager.closeChallenge())
    QuestManager.openChallenge('array-sorting')
    const container = mount(<ChallengeModal onSolved={onSolved} onClose={onClose} />)

    click(container, '[data-testid=challenge-option-a]')
    const editor = container.querySelector<HTMLTextAreaElement>('[data-testid=challenge-code]')
    if (!editor) throw new Error('Challenge editor is missing')
    setTextareaValue(editor, 'function sortArray(arr) { const out = [...arr]; for (let i = 0; i < out.length; i++) { for (let j = 0; j < out.length - i - 1; j++) { if (out[j] > out[j + 1]) { const temp = out[j]; out[j] = out[j + 1]; out[j + 1] = temp; } } } return out; }')
    click(container, '[data-testid=challenge-run]')

    expect(container.querySelector('[data-testid=challenge-success]')?.textContent)
      .toContain('Return to the Old Man for the final quiz')
    expect(onSolved).toHaveBeenCalledTimes(1)
    expect(QuestManager.isChallengeOpen).toBe(true)
    expect(QuestManager.getSnapshot().lastResult?.passed).toBe(true)

    click(container, '[data-testid=challenge-close]')
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(QuestManager.isChallengeOpen).toBe(false)
  })
})
