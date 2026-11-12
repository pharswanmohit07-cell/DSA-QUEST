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
  challengeStore.closeChallenge(false)
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
  it('teaches arrays across navigable pages in the existing lesson panel', () => {
    const container = render(<VillageGuideArraysLesson />)
    expect(container.querySelector('.lesson-panel')).not.toBeNull()
    expect(container.querySelector('.lesson-overlay')).not.toBeNull()
    expect(container.textContent).toContain('1 / 7')
    expect(container.textContent).toContain('What is an array?')
    expect(container.textContent).toContain('Index 0')
    expect(container.textContent).not.toContain('Arrays 1')

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

  it('loses one heart for a wrong answer, retries the same question, then advances on correct', () => {
    const container = render(<VillageGuideArraysLesson />)
    startPractice(container)

    expect(container.querySelector('.quiz-challenge-panel')).not.toBeNull()
    expect(container.querySelector('.array-practice-header')).not.toBeNull()
    expect(container.textContent).toContain('Village Guide')
    expect(container.textContent).not.toContain('Arrays 1')
    expect(container.querySelector('.quiz-challenge-hearts')?.getAttribute('aria-label'))
      .toBe('3 of 3 hearts remaining')

    click(container, '[data-testid="guide-practice-answer-0"]')
    expect(container.querySelector('.quiz-challenge-hearts')?.getAttribute('aria-label'))
      .toBe('2 of 3 hearts remaining')
    expect(container.textContent).toContain('Not quite')
    expect(container.querySelector('[data-testid="guide-practice-retry"]')).not.toBeNull()
    expect(container.textContent).toContain('Question 1 of 3')

    click(container, '[data-testid="guide-practice-retry"]')
    expect(container.textContent).not.toContain('Not quite')
    expect(container.querySelector('.quiz-challenge-hearts')?.getAttribute('aria-label'))
      .toBe('2 of 3 hearts remaining')

    click(container, '[data-testid="guide-practice-answer-1"]')
    expect(container.textContent).toContain('Question 2 of 3')
    expect(container.textContent).toContain('Update index 2 to 35')
    expect(container.querySelector('.quiz-challenge-hearts')?.getAttribute('aria-label'))
      .toBe('2 of 3 hearts remaining')
  })

  it('advances through all three questions automatically and then unlocks the workshop', () => {
    const container = render(<VillageGuideArraysLesson />)
    startPractice(container)

    click(container, '[data-testid="guide-practice-answer-1"]')
    expect(container.textContent).toContain('Question 2 of 3')
    click(container, '[data-testid="guide-practice-answer-0"]')
    expect(container.textContent).toContain('Question 3 of 3')
    click(container, '[data-testid="guide-practice-answer-0"]')

    expect(container.querySelector('[data-testid="guide-practice-passed"]')).not.toBeNull()
    expect(container.textContent).toContain('Practice complete')
    expect(getArraysCampaignStage()).toBe('practice')

    click(container, '[data-testid="guide-practice-continue"]')
    expect(challengeStore.getSnapshot().activeChallenge).toBeNull()
    expect(getArraysCampaignStage()).toBe('implement')
  })

  it('returns to the Guide after all three hearts are used and restarts on a fresh visit', () => {
    const container = render(<VillageGuideArraysLesson />)
    startPractice(container)

    for (let attempt = 0; attempt < 3; attempt += 1) {
      click(container, '[data-testid="guide-practice-answer-0"]')
      if (attempt < 2) click(container, '[data-testid="guide-practice-retry"]')
    }

    expect(container.querySelector('[data-testid="guide-practice-failed"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="guide-practice-return"]')?.textContent)
      .toContain('Return to Village Guide')
    expect(container.querySelector('.quiz-challenge-hearts')?.getAttribute('aria-label'))
      .toBe('0 of 3 hearts remaining')
    expect(getArraysCampaignStage()).toBe('practice')

    click(container, '[data-testid="guide-practice-return"]')
    expect(challengeStore.getSnapshot().activeChallenge).toBeNull()

    if (root) act(() => root?.unmount())
    host?.remove()
    root = undefined
    host = undefined
    challengeStore.openChallenge('village-guide-arrays')
    const resumed = render(<VillageGuideArraysLesson />)
    expect(resumed.textContent).toContain('Question 1 of 3')
    expect(resumed.querySelector('.quiz-challenge-hearts')?.getAttribute('aria-label'))
      .toBe('3 of 3 hearts remaining')
  })
})
