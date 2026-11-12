import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { challengeStore } from './challengeStore'
import { VillageGuideArraysLesson } from './VillageGuideArraysLesson'
import { clearArraysCampaignStage, getArraysCampaignStage } from '../quests/arraysCampaignStages'

const audioEvents = vi.hoisted(() => ({
  playAchievementJingle: vi.fn(),
  playGameOverJingle: vi.fn(),
  startAdventureMusic: vi.fn(),
  startKnowledgeTrialMusic: vi.fn(),
}))

vi.mock('../../audio/soundEffects', () => ({
  playAchievementJingle: audioEvents.playAchievementJingle,
  playGameOverJingle: audioEvents.playGameOverJingle,
}))

vi.mock('../../audio/music', () => ({
  startAdventureMusic: audioEvents.startAdventureMusic,
  startKnowledgeTrialMusic: audioEvents.startKnowledgeTrialMusic,
}))

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
  vi.clearAllMocks()
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

  it('shows red feedback for a wrong answer and advances after Next question', () => {
    const container = render(<VillageGuideArraysLesson />)
    startPractice(container)

    expect(container.querySelector('.quiz-challenge-hearts')?.getAttribute('aria-label'))
      .toBe('3 of 3 hearts remaining')

    click(container, '[data-testid="guide-practice-answer-0"]')
    const feedback = container.querySelector('[data-testid="guide-practice-feedback"]')
    expect(feedback?.classList.contains('is-error')).toBe(true)
    expect(feedback?.textContent).toContain('Not quite')
    expect(feedback?.textContent).toContain('correct answer')
    expect(container.querySelector('.quiz-challenge-hearts')?.getAttribute('aria-label'))
      .toBe('2 of 3 hearts remaining')
    expect(container.textContent).toContain('Question 1 of 3')
    expect(container.querySelector('[data-testid="guide-practice-next"]')?.textContent)
      .toBe('Next question')

    click(container, '[data-testid="guide-practice-next"]')
    expect(container.textContent).toContain('Question 2 of 3')
    expect(container.querySelector('[data-testid="guide-practice-feedback"]')).toBeNull()
  })

  it('shows green feedback for a correct answer before the next question', () => {
    const container = render(<VillageGuideArraysLesson />)
    startPractice(container)

    click(container, '[data-testid="guide-practice-answer-1"]')
    const feedback = container.querySelector('[data-testid="guide-practice-feedback"]')
    expect(feedback?.classList.contains('is-success')).toBe(true)
    expect(feedback?.textContent).toContain('Correct!')
    expect(container.textContent).toContain('Question 1 of 3')
    expect(container.querySelector('[data-testid="guide-practice-next"]')?.textContent)
      .toBe('Next question')
    expect(container.querySelector('.quiz-challenge-hearts')?.getAttribute('aria-label'))
      .toBe('3 of 3 hearts remaining')

    click(container, '[data-testid="guide-practice-next"]')
    expect(container.textContent).toContain('Question 2 of 3')
  })

  it('plays achievement cues after learning and after passing practice', () => {
    const achievement = audioEvents.playAchievementJingle
    const container = render(<VillageGuideArraysLesson />)
    startPractice(container)
    expect(achievement).toHaveBeenCalledOnce()
    achievement.mockClear()

    click(container, '[data-testid="guide-practice-answer-1"]')
    click(container, '[data-testid="guide-practice-next"]')
    click(container, '[data-testid="guide-practice-answer-0"]')
    click(container, '[data-testid="guide-practice-next"]')
    click(container, '[data-testid="guide-practice-answer-0"]')

    expect(container.querySelector('[data-testid="guide-practice-feedback"]')?.textContent)
      .toContain('Correct!')
    expect(container.textContent).toContain('Question 3 of 3')
    expect(container.querySelector('[data-testid="guide-practice-next"]')?.textContent)
      .toBe('Finish practice')

    click(container, '[data-testid="guide-practice-next"]')
    expect(achievement).toHaveBeenCalledOnce()
    expect(container.querySelector('[data-testid="guide-practice-passed"]')).not.toBeNull()
    expect(getArraysCampaignStage()).toBe('practice')

    click(container, '[data-testid="guide-practice-continue"]')
    expect(challengeStore.getSnapshot().activeChallenge).toBe('array-manipulation-workshop')
    expect(challengeStore.getSnapshot().arrayWorkshopStepIndex).toBe(0)
    expect(getArraysCampaignStage()).toBe('implement')
  })

  it('returns to the Village Guide after three mistakes and restarts with three hearts', () => {
    const gameOver = audioEvents.playGameOverJingle
    const container = render(<VillageGuideArraysLesson />)
    startPractice(container)

    click(container, '[data-testid="guide-practice-answer-0"]')
    click(container, '[data-testid="guide-practice-next"]')
    click(container, '[data-testid="guide-practice-answer-1"]')
    click(container, '[data-testid="guide-practice-next"]')
    click(container, '[data-testid="guide-practice-answer-1"]')
    expect(gameOver).toHaveBeenCalledOnce()
    expect(container.querySelector('[data-testid="guide-practice-next"]')?.textContent)
      .toBe('See what happens next')
    click(container, '[data-testid="guide-practice-next"]')

    expect(container.querySelector('[data-testid="guide-practice-failed"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="guide-practice-return"]')?.textContent)
      .toContain('Return to Village Guide')
    expect(getArraysCampaignStage()).toBe('practice')

    click(container, '[data-testid="guide-practice-return"]')
    expect(challengeStore.getSnapshot().activeChallenge).toBeNull()

    if (root) act(() => root?.unmount())
    host?.remove()
    root = undefined
    host = undefined
    act(() => challengeStore.openChallenge('village-guide-arrays'))
    const resumed = render(<VillageGuideArraysLesson />)
    expect(resumed.textContent).toContain('Question 1 of 3')
    expect(resumed.querySelector('.quiz-challenge-hearts')?.getAttribute('aria-label'))
      .toBe('3 of 3 hearts remaining')
  })

})
