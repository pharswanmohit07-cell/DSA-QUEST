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

function unlockQueueTopic() {
  expect(QuestManager.startTopic('arrays')).toBe(true)
  expect(QuestManager.completeTopic('arrays', { passed: true, masteryGrade: 'S', hintsUsed: 0 })).toBe(true)
  expect(QuestManager.startTopic('stack-operations')).toBe(true)
  expect(QuestManager.completeTopic('stack-operations', { passed: true, masteryGrade: 'S', hintsUsed: 0 })).toBe(true)
  expect(QuestManager.startTopic('queues')).toBe(true)
  expect(QuestManager.completeTopic('queues', { passed: true, masteryGrade: 'S', hintsUsed: 0 })).toBe(true)
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

describe('Queue Knowledge Scroll playable trial', () => {
  it('explains circular FIFO controls and shows all five ring slots before play', () => {
    unlockQueueTopic()
    challengeStore.openChallenge('queue-knowledge-scroll')
    const container = render(<QuizChallenge />)

    expect(container.querySelector('[data-testid="campaign-challenge-frame"]')).not.toBeNull()
    expect(container.textContent).toContain('HOW TO PLAY')
    expect(container.textContent).toContain('Enqueue adds the next arrival at REAR')
    expect(container.textContent).toContain('Dequeue removes only the FRONT item')
    expect(container.textContent).toContain('Inspect reads FRONT or REAR without changing the queue')
    expect(container.textContent).toContain('0 / 7 ARRIVED')
    expect(container.textContent).toContain('12')
    expect(container.textContent).toContain('96')
    expect(container.querySelectorAll('[data-testid^="queue-scroll-slot-"]')).toHaveLength(5)
  })

  it('runs the full wrap-around, overflow, inspection, FIFO and underflow relay before claiming', () => {
    unlockQueueTopic()
    challengeStore.openChallenge('queue-knowledge-scroll')
    const container = render(<QuizChallenge />)

    for (let index = 0; index < 4; index += 1) click(container, '[data-testid="queue-scroll-enqueue-next"]')
    for (let index = 0; index < 2; index += 1) click(container, '[data-testid="queue-scroll-dequeue-front"]')
    for (let index = 0; index < 3; index += 1) click(container, '[data-testid="queue-scroll-enqueue-next"]')
    click(container, '[data-testid="queue-scroll-overflow-proof"]')
    click(container, '[data-testid="queue-scroll-inspect-front"]')
    click(container, '[data-testid="queue-scroll-inspect-rear"]')
    for (let index = 0; index < 5; index += 1) click(container, '[data-testid="queue-scroll-dequeue-front"]')

    expect(container.textContent).toContain('7 / 7 DELIVERED')
    expect(container.textContent).toContain('FRONT and REAR inspected')
    click(container, '[data-testid="queue-scroll-underflow-proof"]')
    expect(container.querySelector('[data-testid="queue-scroll-success"]')).not.toBeNull()
    expect(hasKnowledgeScroll('queues')).toBe(false)

    click(container, '[data-testid="queue-scroll-claim"]')
    expect(hasKnowledgeScroll('queues')).toBe(true)
  })
})
