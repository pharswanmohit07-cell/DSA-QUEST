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

function chooseOperation(container: HTMLElement, operation: string): void {
  const select = container.querySelector<HTMLSelectElement>('[data-testid="workshop-operation"]')
  if (!select) throw new Error('Workshop operation selector not found')
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set
    setter?.call(select, operation)
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

function currentArray(container: HTMLElement): number[] {
  return [...container.querySelectorAll<HTMLElement>('[data-testid^="workshop-array-index-"] strong')]
    .map((node) => Number(node.textContent))
}

function perform(
  container: HTMLElement,
  operation: string,
  targetSelector: string | null,
  value: string | null,
): void {
  chooseOperation(container, operation)
  if (targetSelector) click(container, targetSelector)
  if (value !== null) setInput(container, '[data-testid="workshop-value"]', value)
  click(container, '[data-testid="workshop-run"]')
}

function completeWorkshop(container: HTMLElement): void {
  perform(container, 'access', '[data-testid="workshop-array-index-1"]', null)
  perform(container, 'update', '[data-testid="workshop-array-index-1"]', '25')
  perform(container, 'insert', '[data-testid="workshop-insert-gap-1"]', '15')
  perform(container, 'delete', '[data-testid="workshop-array-index-2"]', null)
  perform(container, 'append', null, '35')
  perform(container, 'insert', '[data-testid="workshop-insert-gap-1"]', '12')
  perform(container, 'update', '[data-testid="workshop-array-index-0"]', '5')
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

describe('Interactive Array Manipulation Workshop', () => {
  it('starts with no preselected operation, index, or value', () => {
    const container = render(<ArrayManipulationWorkshop />)
    const operation = container.querySelector<HTMLSelectElement>('[data-testid="workshop-operation"]')
    const value = container.querySelector<HTMLInputElement>('[data-testid="workshop-value"]')

    expect(operation?.value).toBe('')
    expect(value).toBeNull()
    expect(container.textContent).toContain('Find the Value')
    expect(container.querySelector('[data-testid="workshop-array-index-1"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="workshop-selected-index"]')?.textContent)
      .toContain('Choose an array cell')
  })

  it('requires an operation and a cell selection before running', () => {
    const container = render(<ArrayManipulationWorkshop />)
    click(container, '[data-testid="workshop-run"]')

    expect(container.querySelector('[data-testid="workshop-feedback"]')?.textContent)
      .toContain('Choose an operation')
    expect(currentArray(container)).toEqual([10, 20, 30])
    expect(challengeStore.getSnapshot().arrayWorkshopStepIndex).toBe(0)
  })

  it('finds a selected value and shows green feedback before advancing', () => {
    const container = render(<ArrayManipulationWorkshop />)
    perform(container, 'access', '[data-testid="workshop-array-index-1"]', null)

    expect(container.querySelector('[data-testid="workshop-feedback"]')?.className)
      .toContain('is-ok')
    expect(container.querySelector('[data-testid="workshop-feedback"]')?.textContent)
      .toContain('Index 1 contains 20')
    expect(container.textContent).toContain('Change a Value')
    expect(currentArray(container)).toEqual([10, 20, 30])
  })

  it('rejects a wrong operation in red without mutating or advancing the array', () => {
    const container = render(<ArrayManipulationWorkshop />)
    perform(container, 'update', '[data-testid="workshop-array-index-1"]', '25')

    expect(container.querySelector('[data-testid="workshop-feedback"]')?.className)
      .toContain('is-error')
    expect(currentArray(container)).toEqual([10, 20, 30])
    expect(container.textContent).toContain('Find the Value')
    expect(challengeStore.getSnapshot().arrayWorkshopStepIndex).toBe(0)
  })

  it('visually offers insertion gaps and shows values shifting after Insert', () => {
    const container = render(<ArrayManipulationWorkshop />)
    chooseOperation(container, 'insert')

    expect(container.querySelector('[data-testid="workshop-insert-gap-1"]')).not.toBeNull()
    click(container, '[data-testid="workshop-insert-gap-1"]')
    setInput(container, '[data-testid="workshop-value"]', '15')
    click(container, '[data-testid="workshop-run"]')

    perform(container, 'access', '[data-testid="workshop-array-index-1"]', null)
    perform(container, 'update', '[data-testid="workshop-array-index-1"]', '25')
    perform(container, 'insert', '[data-testid="workshop-insert-gap-1"]', '15')

    expect(currentArray(container)).toEqual([10, 15, 25, 30])
    expect(container.querySelector('[data-testid="workshop-feedback"]')?.textContent)
      .toContain('shifted right')
  })

  it('runs the four guided stages and the three-operation Master Challenge', () => {
    const container = render(<ArrayManipulationWorkshop />)

    perform(container, 'access', '[data-testid="workshop-array-index-1"]', null)
    perform(container, 'update', '[data-testid="workshop-array-index-1"]', '25')
    perform(container, 'insert', '[data-testid="workshop-insert-gap-1"]', '15')
    expect(currentArray(container)).toEqual([10, 15, 25, 30])
    perform(container, 'delete', '[data-testid="workshop-array-index-2"]', null)
    expect(currentArray(container)).toEqual([10, 15, 30])

    expect(container.textContent).toContain('Master Challenge')
    expect(container.textContent).toContain('[5, 12, 15, 30, 35]')
    perform(container, 'append', null, '35')
    expect(container.textContent).toContain('Master operations 1 / 3')
    perform(container, 'insert', '[data-testid="workshop-insert-gap-1"]', '12')
    expect(container.textContent).toContain('Master operations 2 / 3')
    perform(container, 'update', '[data-testid="workshop-array-index-0"]', '5')

    expect(container.querySelector('[data-testid="arrays-mastered"]')).not.toBeNull()
    expect(challengeStore.getSnapshot().arrayWorkshopValues).toEqual([5, 12, 15, 30, 35])
    expect(QuestManager.getCampaign().topics.arrays.status).toBe('completed')
  })


  it('shows separate reference arrays instead of spelling out the answer in the task sentence', () => {
    const container = render(<ArrayManipulationWorkshop />)
    perform(container, 'access', '[data-testid="workshop-array-index-1"]', null)
    perform(container, 'update', '[data-testid="workshop-array-index-1"]', '25')

    chooseOperation(container, 'insert')

    const task = container.querySelector('.array-workshop-task')
    expect(task?.textContent).not.toContain('25')
    expect(container.querySelector('[data-testid="workshop-target-array"]')?.textContent)
      .toContain('[10, 15, 25, 30]')
    expect(container.querySelector<HTMLInputElement>('[data-testid="workshop-value"]')?.value).toBe('')
    expect(container.querySelector('[data-testid="workshop-feedback"]')).toBeNull()
  })

  it('keeps an invalid Master append visible beside the task and explains the position mismatch', () => {
    const container = render(<ArrayManipulationWorkshop />)
    perform(container, 'access', '[data-testid="workshop-array-index-1"]', null)
    perform(container, 'update', '[data-testid="workshop-array-index-1"]', '25')
    perform(container, 'insert', '[data-testid="workshop-insert-gap-1"]', '15')
    perform(container, 'delete', '[data-testid="workshop-array-index-2"]', null)

    perform(container, 'append', null, '5')

    const feedback = container.querySelector('[data-testid="workshop-feedback"]')
    expect(feedback?.className).toContain('is-error')
    expect(container.querySelector('.array-workshop-task')?.contains(feedback)).toBe(true)
    expect(feedback?.textContent).toContain('index 0')
    expect(currentArray(container)).toEqual([10, 15, 30])
    expect(challengeStore.getSnapshot().arrayWorkshopOperationIndex).toBe(0)
  })

  it('keeps campaign rewards behind all five stages and awards the first completion once', () => {
    const container = render(<ArrayManipulationWorkshop />)
    expect(challengeStore.completeArraysWorkshop()).toEqual({
      completed: false,
      firstCompletion: false,
    })
    expect(QuestManager.getCampaign().xp).toBe(0)
    expect(QuestManager.getCampaign().topics.arrays.status).toBe('in-progress')

    completeWorkshop(container)
    expect(container.querySelector('[data-testid="arrays-mastered"]')).not.toBeNull()
    expect(container.textContent).toContain('+50 XP')
    expect(container.textContent).toContain('Arrays Relic')
    expect(QuestManager.getCampaign().xp).toBe(50)
    expect(QuestManager.getCampaign().relicEntitlements).toContain('array-relic')
  })

  it('shows optional hints and records hint use without changing the array', () => {
    const container = render(<ArrayManipulationWorkshop />)
    click(container, '[data-testid="workshop-hint"]')

    expect(container.querySelector('[data-testid="workshop-hint-text"]')).not.toBeNull()
    expect(challengeStore.getSnapshot().arrayWorkshopHintsUsed).toBe(1)
    expect(currentArray(container)).toEqual([10, 20, 30])
  })
})
