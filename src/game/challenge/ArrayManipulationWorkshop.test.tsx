import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ArrayManipulationWorkshop } from './ArrayManipulationWorkshop'
import { challengeStore } from './challengeStore'
import { clearArraysCampaignStage } from '../quests/arraysCampaignStages'
import { QuestManager } from '../quests/QuestManager'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let host: HTMLDivElement | undefined
let root: Root | undefined

function render(node: ReactNode): HTMLDivElement {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => root?.render(node))
  return host
}

function click(container: HTMLElement, selector: string): void {
  const button = container.querySelector<HTMLButtonElement>(selector)
  if (!button) throw new Error(`Missing button ${selector}`)
  act(() => button.click())
}

function setInput(container: HTMLElement, selector: string, value: string): void {
  const input = container.querySelector<HTMLInputElement>(selector)
  if (!input) throw new Error(`Missing input ${selector}`)
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

function completeWorkshop(container: HTMLElement): void {
  click(container, '[data-testid="workshop-run"]') // Access index 1
  setInput(container, '[data-testid="workshop-value"]', '25')
  click(container, '[data-testid="workshop-run"]') // Update index 1
  setInput(container, '[data-testid="workshop-value"]', '15')
  click(container, '[data-testid="workshop-run"]') // Insert index 1
  click(container, '[data-testid="workshop-run"]') // Delete index 2
  setInput(container, '[data-testid="workshop-value"]', '40')
  click(container, '[data-testid="workshop-run"]') // Append 40
}

beforeEach(() => {
  localStorage.clear()
  clearArraysCampaignStage()
  QuestManager.reset()
  QuestManager.startTopic('arrays')
  challengeStore.openChallenge('array-manipulation-workshop')
})
afterEach(() => {
  if (root) act(() => root?.unmount())
  host?.remove()
  root = undefined
  host = undefined
  challengeStore.closeChallenge(false)
  clearArraysCampaignStage()
  localStorage.clear()
  QuestManager.reset()
})

describe('Array Manipulation Workshop', () => {
  it('does not award Arrays before all five guided operations succeed', () => {
    const result = challengeStore.completeArraysWorkshop()
    expect(result).toEqual({ completed: false, firstCompletion: false })
    expect(QuestManager.getCampaign().xp).toBe(0)
    expect(QuestManager.getCampaign().topics.arrays.status).toBe('in-progress')
    expect(QuestManager.getCampaign().relicEntitlements).not.toContain('array-relic')
  })

  it('uses the Village Guide name without exposing the source asset-pack label', () => {
    const container = render(<ArrayManipulationWorkshop />)
    expect(container.textContent).toContain('Village Guide')
    expect(container.textContent).not.toContain('Arrays 1')
    expect(container.textContent).not.toContain('Ninja Adventure Pack')
  })

  it('shows editable indexed boxes and prevents an invalid index from changing the array', () => {
    const container = render(<ArrayManipulationWorkshop />)
    expect(container.textContent).toContain('Index 0')
    expect(container.textContent).toContain('Index 1')
    setInput(container, '[data-testid="workshop-index"]', '8')
    click(container, '[data-testid="workshop-run"]')

    expect(container.textContent).toContain('Choose an index from 0 to 2')
    expect(container.querySelector('[data-testid="workshop-array-index-0"]')?.textContent).toContain('10')
    expect(container.querySelector('[data-testid="workshop-array-index-1"]')?.textContent).toContain('20')
  })

  it('completes all five operations and awards the Arrays campaign reward once', () => {
    const container = render(<ArrayManipulationWorkshop />)
    completeWorkshop(container)

    expect(container.querySelector('[data-testid="arrays-mastered"]')).not.toBeNull()
    expect(container.textContent).toContain('ARRAYS MASTERED!')
    expect(container.textContent).toContain('+50 XP')
    expect(container.textContent).toContain('Arrays Relic')
    expect(QuestManager.getCampaign().xp).toBe(50)
    expect(QuestManager.getCampaign().relicEntitlements).toContain('array-relic')
    expect(QuestManager.getCampaign().topics['stack-operations'].status).toBe('available')
  })
})
