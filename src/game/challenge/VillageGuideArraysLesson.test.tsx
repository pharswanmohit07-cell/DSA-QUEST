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


function startPractice(container: HTMLElement): void {
  for (let page = 1; page < 7; page += 1) {
    click(container, '[data-testid="guide-lesson-next"]')
  }
  click(container, '[data-testid="guide-start-practice"]')
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
  it('uses the Elder lesson panel and teaches arrays across multiple navigable pages', () => {
    const container = render(<VillageGuideArraysLesson />)
    expect(container.querySelector('.lesson-panel')).not.toBeNull()
    expect(container.querySelector('.lesson-overlay')).not.toBeNull()
    expect(container.textContent).toContain('1 / 7')
    expect(container.textContent).toContain('What is an array?')
    expect(container.textContent).toContain('Index 0')

    click(container, '[data-testid="guide-lesson-next"]')
    expect(container.textContent).toContain('2 / 7')
    expect(container.textContent).toContain('index')

    click(container, '[data-testid="guide-lesson-next"]')
    expect(container.textContent).toContain('3 / 7')
    expect(container.textContent).toContain('array[index]')

    click(container, '[data-testid="guide-lesson-next"]')
    expect(container.textContent).toContain('4 / 7')
    expect(container.textContent).toContain('Update')

    click(container, '[data-testid="guide-lesson-next"]')
    expect(container.textContent).toContain('5 / 7')
    expect(container.textContent).toContain('Insert')

    click(container, '[data-testid="guide-lesson-next"]')
    expect(container.textContent).toContain('6 / 7')
    expect(container.textContent).toContain('Delete')
    expect(container.textContent).toContain('Append')

    click(container, '[data-testid="guide-lesson-next"]')
    expect(container.textContent).toContain('7 / 7')
    expect(container.textContent).toContain('O(1)')
    expect(container.textContent).toContain('O(n)')
    expect(container.textContent).toContain('I understand — start practice')

    click(container, '[data-testid="guide-lesson-back"]')
    expect(container.textContent).toContain('6 / 7')
  })

  it('uses the Elder quiz panel with three hearts and a retry action after a wrong answer', () => {
    const container = render(<VillageGuideArraysLesson />)
    startPractice(container)
    expect(container.querySelector('.quiz-challenge-panel')).not.toBeNull()
    expect(container.querySelector('.array-practice-header')).not.toBeNull()
    expect(container.querySelector('.quiz-challenge-hearts')?.getAttribute('aria-label')).toBe('3 of 3 hearts remaining')

    click(container, '[data-testid="guide-practice-answer-0"]')
    expect(container.querySelector('.quiz-challenge-hearts')?.getAttribute('aria-label')).toBe('2 of 3 hearts remaining')
    expect(container.textContent).toContain('Not quite')
    expect(container.textContent).toContain('Try again')
    expect(container.querySelector('[data-testid="guide-practice-retry"]')).not.toBeNull()
    expect(getArraysCampaignStage()).toBe('practice')

    click(container, '[data-testid="guide-practice-retry"]')
    expect(container.textContent).not.toContain('Not quite')
    expect(container.querySelector('.quiz-challenge-hearts')?.getAttribute('aria-label')).toBe('2 of 3 hearts remaining')

    click(container, '[data-testid="guide-practice-answer-1"]')
    expect(container.textContent).toContain('Correct!')
    expect(container.querySelector('.quiz-challenge-hearts')?.getAttribute('aria-label')).toBe('2 of 3 hearts remaining')
  })

  it('allows restarting the practice after all three hearts are used', () => {
    const container = render(<VillageGuideArraysLesson />)
    startPractice(container)
    for (let attempt = 0; attempt < 3; attempt += 1) {
      click(container, '[data-testid="guide-practice-answer-0"]')
      if (attempt < 2) click(container, '[data-testid="guide-practice-retry"]')
    }

    expect(container.textContent).toContain('No hearts left')
    expect(container.querySelector('[data-testid="guide-practice-restart"]')).not.toBeNull()
    click(container, '[data-testid="guide-practice-restart"]')
    expect(container.querySelector('.quiz-challenge-hearts')?.getAttribute('aria-label')).toBe('3 of 3 hearts remaining')
    expect(container.textContent).toContain('Question 1 of 3')
  })

  it('advances through all three questions and unlocks the workshop stage', () => {
    const container = render(<VillageGuideArraysLesson />)
    startPractice(container)
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
