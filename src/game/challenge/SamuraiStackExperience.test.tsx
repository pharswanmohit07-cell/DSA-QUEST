import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { QuizChallenge } from './QuizChallenge'
import { challengeStore } from './challengeStore'
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
  if (!button) throw new Error('Button not found: ' + selector)
  act(() => button.click())
}

function unlockArrays() {
  expect(QuestManager.startTopic('arrays')).toBe(true)
  expect(QuestManager.completeTopic('arrays', { passed: true, masteryGrade: 'S', hintsUsed: 0 })).toBe(true)
}

beforeEach(() => {
  challengeStore.closeChallenge(false)
  localStorage.clear()
  QuestManager.reset()
})

afterEach(() => {
  if (root) act(() => root?.unmount())
  host?.remove()
  root = undefined
  host = undefined
  challengeStore.closeChallenge(false)
  localStorage.clear()
})

describe('Samurai Stack learning screens', () => {
  it('moves through the Dojo lesson and opens the Stack question bank', () => {
    unlockArrays()
    expect(challengeStore.openSamuraiStackLesson()).toBe(true)
    const container = render(<QuizChallenge />)

    expect(container.querySelector('[data-testid="campaign-challenge-frame"]')).not.toBeNull()
    expect(container.textContent).toContain('LEARN')
    expect(container.textContent).toContain("The Dojo's Lost Scrolls")
    click(container, '[data-testid="samurai-stack-lesson-next"]')
    expect(container.textContent).toContain('Push, Peek and Pop')
    click(container, '[data-testid="samurai-stack-lesson-next"]')
    expect(container.textContent).toContain('The Top-Only Rule')
    click(container, '[data-testid="samurai-stack-lesson-next"]')
    expect(container.querySelector('[data-testid="campaign-challenge-frame"]')).not.toBeNull()
    expect(container.textContent).toContain('PRACTICE')
    expect(container.textContent).toContain('Dojo Knowledge Check')
    expect(challengeStore.getSnapshot().activeChallenge).toBe('samurai-stack-quiz')
  })

  it('moves from the three-question Stack quiz into the guided Dojo tower', () => {
    unlockArrays()
    expect(challengeStore.openSamuraiStackLesson()).toBe(true)
    const container = render(<QuizChallenge />)
    for (let page = 0; page < 3; page += 1) click(container, '[data-testid="samurai-stack-lesson-next"]')

    for (let questionIndex = 0; questionIndex < 3; questionIndex += 1) {
      const question = challengeStore.getSnapshot().quizQuestions[challengeStore.getSnapshot().currentQuestionIndex]!
      click(container, '[data-testid="samurai-stack-answer-' + question.correctAnswerIndex + '"]')
      click(container, '.quiz-challenge-continue')
    }

    expect(challengeStore.getSnapshot().activeChallenge).toBe('samurai-stack-dojo')
    expect(container.querySelector('[data-testid="campaign-challenge-frame"]')).not.toBeNull()
    expect(container.textContent).toContain('IMPLEMENT')
    expect(container.textContent).toContain('HOW TO PLAY')
    expect(container.textContent).toContain('Push: place a scroll on TOP')
    expect(container.textContent).toContain('Peek: inspect the TOP scroll without removing it.')
    expect(container.textContent).toContain('recover the marked scroll in the final trial')
    expect(container.textContent).toContain('Dojo Scroll Tower')
    expect(container.textContent).toContain('Push the River Scroll onto the tower')
  })

  it('renders a visible top marker and lets the player push and peek through the UI', () => {
    unlockArrays()
    expect(challengeStore.openSamuraiStackLesson()).toBe(true)
    for (let page = 0; page < 3; page += 1) challengeStore.advanceSamuraiStackLesson()
    for (const question of challengeStore.getSnapshot().quizQuestions) {
      challengeStore.answerSamuraiStackQuiz(question.correctAnswerIndex)
      challengeStore.advanceSamuraiStackQuiz()
    }
    const container = render(<QuizChallenge />)

    click(container, '[data-testid="samurai-stack-push-river"]')
    expect(container.textContent).toContain('River Scroll')
    expect(container.querySelector('[data-testid="samurai-stack-slot-0"]')?.textContent).toContain('TOP')
    click(container, '[data-testid="samurai-stack-push-mountain"]')
    click(container, '[data-testid="samurai-stack-peek"]')
    expect(container.textContent).toContain('Peek sees Mountain Scroll')
    expect(challengeStore.getSnapshot().samuraiStackProgress?.stack).toEqual(['river', 'mountain'])
  })
})
