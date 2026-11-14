import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { QuizChallenge } from './QuizChallenge'
import { QueueChallenge } from './QueueChallenge'
import { challengeStore } from './challengeStore'
import { QUEUE_SUPPLY_STEPS } from './queueChallenge'
import { QuestManager } from '../quests/QuestManager'
import { getFarmerQueueOpeningRoute } from '../quests/farmerQueueRouting'

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

function unlockEarlierTopics() {
  expect(QuestManager.startTopic('arrays')).toBe(true)
  expect(QuestManager.completeTopic('arrays', { passed: true, masteryGrade: 'S', hintsUsed: 0 })).toBe(true)
  expect(QuestManager.startTopic('stack-operations')).toBe(true)
  expect(QuestManager.completeTopic('stack-operations', { passed: true, masteryGrade: 'S', hintsUsed: 0 })).toBe(true)
}

function startFarmerLesson(container: HTMLElement) {
  act(() => { expect(challengeStore.openFarmerQueueLesson()).toBe(true) })
  expect(container.textContent).toContain('A Line of Village Supplies')
  click(container, '[data-testid="farmer-queue-lesson-next"]')
  expect(container.textContent).toContain('Enqueue at the REAR')
  click(container, '[data-testid="farmer-queue-lesson-next"]')
  expect(container.textContent).toContain('Dequeue from the FRONT')
  click(container, '[data-testid="farmer-queue-lesson-next"]')
  expect(container.textContent).toContain('Load the Supply Cart')
  click(container, '[data-testid="farmer-queue-practice-action"]')
  click(container, '[data-testid="farmer-queue-practice-action"]')
  click(container, '[data-testid="farmer-queue-practice-action"]')
  expect(container.textContent).toContain('FIFO understood!')
  click(container, '[data-testid="farmer-queue-start-delivery"]')
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

describe('Farmer Queue campaign', () => {
  it('keeps the 15-step guided queue tutorial, then requires the quiz and a separate delivery round before mastery', () => {
    unlockEarlierTopics()
    const xpBeforeQueue = QuestManager.getCampaign().xp
    const container = render(
      <>
        <QuizChallenge />
        <QueueChallenge />
      </>,
    )

    startFarmerLesson(container)
    expect(challengeStore.getSnapshot().activeChallenge).toBe('queue-village-supply')
    for (const step of QUEUE_SUPPLY_STEPS) {
      act(() => { challengeStore.executeQueueOp(step.operation) })
    }
    expect(challengeStore.getSnapshot().isComplete).toBe(true)
    expect(container.querySelector('[data-testid="queue-success"]')).not.toBeNull()
    expect(QuestManager.getCampaign().topics.queues.status).toBe('in-progress')
    expect(QuestManager.getCampaign().relicEntitlements).not.toContain('queue-relic')

    click(container, '[data-testid="queue-continue"]')
    expect(challengeStore.getSnapshot().activeChallenge).toBe('farmer-queue-final-quiz')
    expect(container.textContent).toContain('Supply Route Knowledge Check')

    const selectedQuestions = [...challengeStore.getSnapshot().quizQuestions]
    for (const question of selectedQuestions) {
      click(container, '[data-testid=farmer-queue-quiz-option-' + question.correctAnswerIndex + ']')
      click(container, '[data-testid="farmer-queue-quiz-next"]')
    }

    expect(challengeStore.getSnapshot().quizStatus).toBe('passed')
    expect(container.textContent).toContain('QUEUE KNOWLEDGE CHECK PASSED')
    expect(QuestManager.getCampaign().topics.queues.status).toBe('in-progress')
    expect(QuestManager.getCampaign().relicEntitlements).not.toContain('queue-relic')
    expect(QuestManager.getCampaign().xp).toBe(xpBeforeQueue)

    click(container, '[data-testid="farmer-queue-continue-to-delivery"]')
    expect(challengeStore.getSnapshot().activeChallenge).toBe('farmer-queue-delivery')
    expect(container.textContent).toContain('Five village drop-offs')

    for (let index = 0; index < 4; index += 1) {
      click(container, '[data-testid="farmer-delivery-load-next"]')
    }
    expect(challengeStore.getSnapshot().currentQueue).toEqual([12, 24, 36, 48])
    click(container, '[data-testid="farmer-delivery-load-next"]')
    expect(challengeStore.getSnapshot().feedback?.message).toMatch(/overflow|full/i)
    expect(challengeStore.getSnapshot().currentQueue).toEqual([12, 24, 36, 48])

    click(container, '[data-testid="farmer-delivery-inspect-front"]')
    click(container, '[data-testid="farmer-delivery-inspect-rear"]')
    expect(challengeStore.getSnapshot().deliveredQueueValues).toEqual([])
    click(container, '[data-testid="farmer-delivery-dispatch-front"]')
    expect(challengeStore.getSnapshot().deliveredQueueValues).toEqual([12])
    click(container, '[data-testid="farmer-delivery-load-next"]')

    for (let index = 0; index < 4; index += 1) {
      click(container, '[data-testid="farmer-delivery-dispatch-front"]')
    }
    expect(challengeStore.getSnapshot().isComplete).toBe(true)
    expect(container.textContent).toContain('All five parcels delivered!')
    expect(QuestManager.getCampaign().relicEntitlements).not.toContain('queue-relic')

    click(container, '[data-testid="farmer-queue-delivery-complete"]')
    const campaign = QuestManager.getCampaign()
    expect(campaign.topics.queues.status).toBe('completed')
    expect(campaign.topics['linked-lists'].status).toBe('available')
    expect(campaign.relicEntitlements).toContain('queue-relic')
    expect(campaign.firstCompletionRewardClaims).toContain('queues')
    expect(campaign.xp).toBe(xpBeforeQueue + 50)
    expect(JSON.parse(localStorage.getItem('dsa-quest-queue-quiz-history-v1') ?? '[]')).toEqual(
      selectedQuestions.map((question) => question.id),
    )
    expect(challengeStore.getSnapshot().activeChallenge).toBeNull()
  })

  it('does not award Queue completion when the final quiz is failed and closed', () => {
    unlockEarlierTopics()
    const xpBeforeQueue = QuestManager.getCampaign().xp
    const container = render(
      <>
        <QuizChallenge />
        <QueueChallenge />
      </>,
    )
    startFarmerLesson(container)

    for (const step of QUEUE_SUPPLY_STEPS) {
      act(() => { challengeStore.executeQueueOp(step.operation) })
    }
    click(container, '[data-testid="queue-continue"]')

    for (const question of challengeStore.getSnapshot().quizQuestions) {
      const wrongAnswer = (question.correctAnswerIndex + 1) % question.options.length
      click(container, '[data-testid=farmer-queue-quiz-option-' + wrongAnswer + ']')
      click(container, '[data-testid="farmer-queue-quiz-next"]')
    }

    expect(challengeStore.getSnapshot().quizStatus).toBe('failed')
    act(() => { challengeStore.closeChallenge(false) })
    const campaign = QuestManager.getCampaign()
    expect(campaign.topics.queues.status).toBe('available')
    expect(campaign.topics['linked-lists'].status).toBe('locked')
    expect(campaign.relicEntitlements).not.toContain('queue-relic')
    expect(campaign.xp).toBe(xpBeforeQueue)
    expect(getFarmerQueueOpeningRoute(campaign.topics.queues.status)).toBeNull()
    act(() => { expect(challengeStore.openFarmerQueueLesson()).toBe(true) })
    expect(challengeStore.getSnapshot().activeChallenge).toBe('farmer-queue-lesson')
  })
})
