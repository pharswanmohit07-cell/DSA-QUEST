import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FarmerQueueDeliveryChallenge } from './FarmerQueueDeliveryChallenge'
import { challengeStore } from './challengeStore'
import { QUEUE_SUPPLY_STEPS } from './queueChallenge'
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

function click(container: HTMLElement, selector: string) {
  const button = container.querySelector<HTMLButtonElement>(selector)
  if (!button) throw new Error('Button not found: ' + selector)
  act(() => button.click())
}

function startIndependentDeliveryRound() {
  expect(challengeStore.openFarmerQueueLesson()).toBe(true)
  for (let page = 0; page < 3; page += 1) challengeStore.advanceFarmerQueueLesson()
  challengeStore.beginFarmerQueueDelivery()
  for (const step of QUEUE_SUPPLY_STEPS) challengeStore.executeQueueOp(step.operation)
  challengeStore.closeChallenge(true)
  for (const question of challengeStore.getSnapshot().quizQuestions) {
    challengeStore.answerFarmerQueueQuiz(question.correctAnswerIndex)
    challengeStore.advanceFarmerQueueQuiz()
  }
  challengeStore.closeChallenge(true)
  expect(challengeStore.getSnapshot().activeChallenge).toBe('farmer-queue-delivery')
}

function unlockQueueTopic() {
  expect(QuestManager.startTopic('arrays')).toBe(true)
  expect(QuestManager.completeTopic('arrays', { passed: true, masteryGrade: 'S', hintsUsed: 0 })).toBe(true)
  expect(QuestManager.startTopic('stack-operations')).toBe(true)
  expect(QuestManager.completeTopic('stack-operations', { passed: true, masteryGrade: 'S', hintsUsed: 0 })).toBe(true)
}

beforeEach(() => {
  challengeStore.closeChallenge(false)
  localStorage.clear()
  QuestManager.reset()
  unlockQueueTopic()
})

afterEach(() => {
  if (root) act(() => root?.unmount())
  host?.remove()
  root = undefined
  host = undefined
  challengeStore.closeChallenge(false)
  localStorage.clear()
})

describe('Farmer Queue independent Delivery experience', () => {
  it('shows named village destinations and updates delivery status only after FIFO dispatch', () => {
    startIndependentDeliveryRound()
    const container = render(<FarmerQueueDeliveryChallenge />)

    expect(container.textContent).toContain('Five village drop-offs')
    expect(container.textContent).toContain('Rice sack')
    expect(container.textContent).toContain('North Cottage')
    expect(container.textContent).toContain('Medicine kit')
    expect(container.textContent).toContain('Village Clinic')
    expect(container.textContent).toContain('0 / 5 DELIVERED')

    click(container, '[data-testid="farmer-delivery-dispatch-front"]')
    expect(container.querySelector('[data-testid="farmer-delivery-feedback"]')?.textContent).toMatch(/underflow|empty queue/i)
    expect(challengeStore.getSnapshot().deliveredQueueValues).toEqual([])

    for (let index = 0; index < 4; index += 1) {
      click(container, '[data-testid="farmer-delivery-load-next"]')
    }
    expect(container.querySelector('[data-testid="farmer-delivery-parcel-12"]')?.className).toContain('is-next')
    expect(container.textContent).toContain('4 / 4 SLOTS USED')

    click(container, '[data-testid="farmer-delivery-load-next"]')
    expect(container.querySelector('[data-testid="farmer-delivery-feedback"]')?.textContent).toMatch(/overflow|full/i)
    expect(container.querySelector('[data-testid="farmer-delivery-progress"]')?.textContent).toContain('0 / 5')

    click(container, '[data-testid="farmer-delivery-inspect-front"]')
    expect(challengeStore.getSnapshot().deliveredQueueValues).toEqual([])
    expect(challengeStore.getSnapshot().currentQueue).toEqual([12, 24, 36, 48])

    click(container, '[data-testid="farmer-delivery-dispatch-front"]')
    expect(container.querySelector('[data-testid="farmer-delivery-progress"]')?.textContent).toContain('1 / 5')
    expect(container.querySelector('[data-testid="farmer-delivery-parcel-12"]')?.className).toContain('is-delivered')
    expect(container.querySelector('[data-testid="farmer-delivery-parcel-24"]')?.className).toContain('is-next')
    expect(container.textContent).toContain('Medicine kit')
  })
})
