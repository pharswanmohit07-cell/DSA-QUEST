import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { QuizChallenge } from './QuizChallenge'
import { challengeStore } from './challengeStore'
import { QuestManager } from '../quests/QuestManager'
import { hasKnowledgeScroll } from '../quests/knowledgeScrolls'

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

function click(container: HTMLElement, selector: string) {
  const button = container.querySelector<HTMLButtonElement>(selector)
  if (!button) throw new Error('Button not found: ' + selector)
  act(() => button.click())
}


function hanoiMoves(count: number, from: 'A' | 'B' | 'C', to: 'A' | 'B' | 'C', spare: 'A' | 'B' | 'C', moves: Array<['A' | 'B' | 'C', 'A' | 'B' | 'C']> = []) {
  if (count === 0) return moves
  hanoiMoves(count - 1, from, spare, to, moves)
  moves.push([from, to])
  return hanoiMoves(count - 1, spare, to, from, moves)
}

function unlockStackTopic() {
  expect(QuestManager.startTopic('arrays')).toBe(true)
  expect(QuestManager.completeTopic('arrays', { passed: true, masteryGrade: 'S', hintsUsed: 0 })).toBe(true)
  expect(QuestManager.startTopic('stack-operations')).toBe(true)
  expect(QuestManager.completeTopic('stack-operations', { passed: true, masteryGrade: 'S', hintsUsed: 0 })).toBe(true)
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

describe('Stack Knowledge Scroll playable trial', () => {
  it('explains the three-tower rules and shows the scroll count and move budget before play', () => {
    unlockStackTopic()
    challengeStore.openChallenge('stack-knowledge-scroll')
    const container = render(<QuizChallenge />)

    expect(container.querySelector('[data-testid="campaign-challenge-frame"]')).not.toBeNull()
    expect(container.textContent).toContain('HOW TO PLAY')
    expect(container.textContent).toContain('Move only the TOP scroll')
    expect(container.textContent).toContain('Never place a larger scroll on a smaller one')
    expect(container.textContent).toContain('3 SCROLLS')
    expect(container.textContent).toContain('0 / 9 MOVES')
    expect(container.querySelectorAll('[data-testid^="stack-rescue-tower-"]')).toHaveLength(3)
  })

  it('allows a legal top move, rejects a larger-on-smaller move, and does not claim on exit', () => {
    unlockStackTopic()
    challengeStore.openChallenge('stack-knowledge-scroll')
    const container = render(<QuizChallenge />)

    click(container, '[data-testid="stack-rescue-tower-A"]')
    click(container, '[data-testid="stack-rescue-tower-C"]')
    expect(container.textContent).toContain('1 / 9 MOVES')

    click(container, '[data-testid="stack-rescue-tower-A"]')
    click(container, '[data-testid="stack-rescue-tower-C"]')
    expect(container.textContent).toContain('larger scroll cannot be placed on a smaller scroll')
    click(container, '[aria-label="Leave Stack Knowledge Scroll trial"]')
    expect(hasKnowledgeScroll('stack-operations')).toBe(false)
  })

  it('clears the 3-, 4- and 5-scroll towers in sequence before the Scroll can be claimed', () => {
    unlockStackTopic()
    challengeStore.openChallenge('stack-knowledge-scroll')
    const container = render(<QuizChallenge />)

    for (const scrollCount of [3, 4, 5]) {
      for (const [from, to] of hanoiMoves(scrollCount, 'A', 'C', 'B')) {
        click(container, '[data-testid="stack-rescue-tower-' + from + '"]')
        click(container, '[data-testid="stack-rescue-tower-' + to + '"]')
      }
      if (scrollCount < 5) {
        click(container, '[data-testid="stack-scroll-next-round"]')
      }
    }

    expect(container.querySelector('[data-testid="stack-scroll-success"]')).not.toBeNull()
    expect(hasKnowledgeScroll('stack-operations')).toBe(false)
    click(container, '[data-testid="stack-scroll-claim"]')
    expect(hasKnowledgeScroll('stack-operations')).toBe(true)
  })
})
