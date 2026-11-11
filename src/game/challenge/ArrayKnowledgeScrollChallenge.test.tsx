import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QuizChallenge } from './QuizChallenge'
import { challengeStore, registerChallengeSceneBridge } from './challengeStore'
import { QuestManager } from '../quests/QuestManager'
import { resetArrayScrollQuestionHistory } from './arrayScrollQuestionBank'

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

function setValue<T extends HTMLInputElement | HTMLTextAreaElement>(
  container: HTMLElement,
  selector: string,
  value: string,
): void {
  const field = container.querySelector<T>(selector)
  if (!field) throw new Error(`Field not found: ${selector}`)
  const prototype = field instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  act(() => {
    setter?.call(field, value)
    field.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

beforeEach(() => {
  challengeStore.closeChallenge(false)
  QuestManager.reset()
  localStorage.clear()
  resetArrayScrollQuestionHistory()
  vi.spyOn(Math, 'random').mockReturnValue(0.1)
})

afterEach(() => {
  if (root) act(() => root?.unmount())
  host?.remove()
  root = undefined
  host = undefined
  challengeStore.closeChallenge(false)
  unregisterBridge?.()
  unregisterBridge = undefined
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('Optional Arrays Knowledge Scroll challenge', () => {
  it('uses 3, 2, and 1 hearts for array addition, subtraction, and palindrome', () => {
    const resumeCalls: Array<{ challengeId: string; completedSuccessfully: boolean }> = []
    unregisterBridge = registerChallengeSceneBridge({
      pausePlayer: () => undefined,
      resumePlayer: (challengeId, completedSuccessfully) => {
        resumeCalls.push({ challengeId, completedSuccessfully })
      },
    })

    challengeStore.openChallenge('array-knowledge-scroll', [])
    const container = mount(<QuizChallenge />)

    expect(container.querySelector('[data-testid="scroll-easy-round"]')?.getAttribute('data-question-id'))
      .toBe('easy-add-pairs')
    expect(container.querySelector('[data-testid="scroll-hearts"]')?.getAttribute('aria-label'))
      .toContain('3 of 3 hearts')

    click(container, '[data-testid="scroll-easy-option-1"]')
    expect(container.querySelector('[data-testid="scroll-wrong-answer-popup"]')?.textContent)
      .toContain('Try again!')
    expect(container.querySelector('[data-testid="scroll-hearts"]')?.getAttribute('aria-label'))
      .toContain('2 of 3 hearts')
    click(container, '[data-testid="scroll-wrong-answer-retry"]')

    click(container, '[data-testid="scroll-easy-option-0"]')
    expect(container.querySelector('[data-testid="scroll-medium-round"]')?.getAttribute('data-question-id'))
      .toBe('medium-subtract-arrays')
    expect(container.querySelector('[data-testid="scroll-feedback"]')).toBeNull()
    expect(container.querySelector('[data-testid="scroll-hearts"]')?.getAttribute('aria-label'))
      .toContain('2 of 2 hearts')

    setValue(container, '[data-testid="scroll-medium-input"]', '[9, 3, 2]')
    click(container, '[data-testid="scroll-medium-submit"]')
    expect(container.querySelector('[data-testid="scroll-wrong-answer-popup"]')?.textContent)
      .toContain('Try again!')
    expect(container.querySelector('[data-testid="scroll-hearts"]')?.getAttribute('aria-label'))
      .toContain('1 of 2 hearts')
    click(container, '[data-testid="scroll-wrong-answer-retry"]')

    setValue(container, '[data-testid="scroll-medium-input"]', '[5, 4, 3]')
    click(container, '[data-testid="scroll-medium-submit"]')
    expect(container.querySelector('[data-testid="scroll-hard-round"]')?.getAttribute('data-question-id'))
      .toBe('hard-palindrome')
    expect(container.querySelector('[data-testid="scroll-hearts"]')?.getAttribute('aria-label'))
      .toContain('1 of 1 hearts')

    setValue(
      container,
      '[data-testid="scroll-hard-editor"]',
      'function isPalindrome(word) { let left = 0; let right = word.length - 1; while (left < right) { if (word[left] !== word[right]) return false; left++; right--; } return true; }',
    )
    click(container, '[data-testid="scroll-hard-run"]')
    expect(container.querySelector('[data-testid="scroll-hard-results"]')?.textContent)
      .toContain('4 / 4 tests passed')
    expect(container.querySelector('[data-testid="scroll-claim"]')?.textContent)
      .toContain('Claim Arrays Knowledge Scroll')

    click(container, '[data-testid="scroll-claim"]')
    expect(challengeStore.getSnapshot().activeChallenge).toBeNull()
    expect(resumeCalls).toEqual([
      { challengeId: 'array-knowledge-scroll', completedSuccessfully: true },
    ])
  })

  it('returns to the Old Man after all three Easy hearts are used', () => {
    const resumeCalls: Array<{ challengeId: string; completedSuccessfully: boolean }> = []
    unregisterBridge = registerChallengeSceneBridge({
      pausePlayer: () => undefined,
      resumePlayer: (challengeId, completedSuccessfully) => {
        resumeCalls.push({ challengeId, completedSuccessfully })
      },
    })

    challengeStore.openChallenge('array-knowledge-scroll', [])
    const container = mount(<QuizChallenge />)

    for (let attempt = 0; attempt < 3; attempt += 1) {
      click(container, '[data-testid="scroll-easy-option-1"]')
      if (attempt < 2) click(container, '[data-testid="scroll-wrong-answer-retry"]')
    }

    expect(container.querySelector('[data-testid="scroll-wrong-answer-popup"]')?.textContent)
      .toContain('NO HEARTS LEFT')
    expect(container.textContent).toContain('Speak to the Old Man again')
    click(container, '[data-testid="scroll-return-to-old-man"]')

    expect(challengeStore.getSnapshot().activeChallenge).toBeNull()
    expect(resumeCalls).toEqual([
      { challengeId: 'array-knowledge-scroll', completedSuccessfully: false },
    ])
  })

  it('returns to the Old Man when both Medium hearts are used', () => {
    challengeStore.openChallenge('array-knowledge-scroll', [])
    const container = mount(<QuizChallenge />)

    click(container, '[data-testid="scroll-easy-option-0"]')
    setValue(container, '[data-testid="scroll-medium-input"]', '[0, 0, 0]')
    click(container, '[data-testid="scroll-medium-submit"]')
    expect(container.querySelector('[data-testid="scroll-hearts"]')?.getAttribute('aria-label'))
      .toContain('1 of 2 hearts')
    click(container, '[data-testid="scroll-wrong-answer-retry"]')

    setValue(container, '[data-testid="scroll-medium-input"]', '[1, 2, 3]')
    click(container, '[data-testid="scroll-medium-submit"]')
    expect(container.querySelector('[data-testid="scroll-wrong-answer-popup"]')?.textContent)
      .toContain('NO HEARTS LEFT')
    click(container, '[data-testid="scroll-return-to-old-man"]')
    expect(challengeStore.getSnapshot().activeChallenge).toBeNull()
  })

  it('uses the single Hard heart and requires the player to return to the Old Man after a failed palindrome', () => {
    challengeStore.openChallenge('array-knowledge-scroll', [])
    const container = mount(<QuizChallenge />)

    click(container, '[data-testid="scroll-easy-option-0"]')
    setValue(container, '[data-testid="scroll-medium-input"]', '[5, 4, 3]')
    click(container, '[data-testid="scroll-medium-submit"]')
    expect(container.querySelector('[data-testid="scroll-hearts"]')?.getAttribute('aria-label'))
      .toContain('1 of 1 hearts')

    setValue(container, '[data-testid="scroll-hard-editor"]', 'function isPalindrome(word) { return true; }')
    click(container, '[data-testid="scroll-hard-run"]')
    expect(container.querySelector('[data-testid="scroll-wrong-answer-popup"]')?.textContent)
      .toContain('NO HEARTS LEFT')
    click(container, '[data-testid="scroll-return-to-old-man"]')
    expect(challengeStore.getSnapshot().activeChallenge).toBeNull()
  })

  it('does not award a scroll when the player leaves before completing the challenge', () => {
    const resumeCalls: Array<{ challengeId: string; completedSuccessfully: boolean }> = []
    unregisterBridge = registerChallengeSceneBridge({
      pausePlayer: () => undefined,
      resumePlayer: (challengeId, completedSuccessfully) => {
        resumeCalls.push({ challengeId, completedSuccessfully })
      },
    })
    challengeStore.openChallenge('array-knowledge-scroll', [])
    const container = mount(<QuizChallenge />)

    click(container, '[data-testid="scroll-close"]')

    expect(resumeCalls).toEqual([
      { challengeId: 'array-knowledge-scroll', completedSuccessfully: false },
    ])
  })
})
