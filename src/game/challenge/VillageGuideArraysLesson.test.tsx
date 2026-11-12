import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { challengeStore } from './challengeStore'
import { VillageGuideArraysLesson } from './VillageGuideArraysLesson'
import { clearArraysCampaignStage, getArraysCampaignStage } from '../quests/arraysCampaignStages'

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

beforeEach(() => {
  localStorage.clear()
  clearArraysCampaignStage()
  challengeStore.openChallenge('village-guide-arrays')
})
afterEach(() => {
  if (root) act(() => root?.unmount())
  host?.remove()
  root = undefined
  host = undefined
  challengeStore.closeChallenge(false)
  clearArraysCampaignStage()
  localStorage.clear()
})

describe('Village Guide Arrays lesson and practice', () => {
  it('teaches indexed boxes, array operations, and basic complexity', () => {
    const container = render(<VillageGuideArraysLesson />)
    expect(container.textContent).toContain('An array is a row of boxes')
    expect(container.textContent).toContain('Index 0')
    expect(container.textContent).toContain('O(1)')
    expect(container.textContent).toContain('O(n)')
    expect(container.textContent).toContain('Insert')
    expect(container.textContent).toContain('Append')
  })

  it('offers exactly three guided questions and explains a wrong answer without advancing', () => {
    const container = render(<VillageGuideArraysLesson />)
    click(container, '[data-testid="guide-start-practice"]')
    expect(container.textContent).toContain('What value is stored at index 1')

    click(container, '[data-testid="guide-practice-answer-0"]')
    expect(container.textContent).toContain('Not quite')
    expect(container.textContent).toContain('Try again')
    expect(container.textContent).toContain('What value is stored at index 1')
    expect(getArraysCampaignStage()).toBe('practice')

    click(container, '[data-testid="guide-practice-answer-1"]')
    expect(container.textContent).toContain('Correct!')
  })

  it('advances through all three questions and unlocks the workshop stage', () => {
    const container = render(<VillageGuideArraysLesson />)
    click(container, '[data-testid="guide-start-practice"]')
    click(container, '[data-testid="guide-practice-answer-1"]')
    click(container, '[data-testid="guide-practice-next"]')
    expect(container.textContent).toContain('Update index 2 to 35')
    click(container, '[data-testid="guide-practice-answer-0"]')
    click(container, '[data-testid="guide-practice-next"]')
    expect(container.textContent).toContain('Insert 15 at index 1')
    click(container, '[data-testid="guide-practice-answer-0"]')
    click(container, '[data-testid="guide-practice-next"]')

    expect(getArraysCampaignStage()).toBe('implement')
    expect(challengeStore.getSnapshot().activeChallenge).toBeNull()
  })
})
