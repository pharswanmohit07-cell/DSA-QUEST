import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { challengeStore, registerChallengeSceneBridge } from './challengeStore'
import { QuizChallenge } from './QuizChallenge'
import { getArraysCampaignStage, setArraysCampaignStage } from '../quests/arraysCampaignStages'
import { QuestManager } from '../quests/QuestManager'

vi.mock('../../audio/music', () => ({
  startAdventureMusic: vi.fn(),
  startKnowledgeTrialMusic: vi.fn(),
}))

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let host: HTMLDivElement | undefined
let root: Root | undefined
let unregisterBridge: (() => void) | undefined
let resumeCalls: string[] = []

function render(node: ReactNode): HTMLDivElement {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => root?.render(node))
  return host
}

function click(container: HTMLElement, selector: string): void {
  const button = container.querySelector<HTMLButtonElement>(selector)
  if (!button) throw new Error(`Missing button: ${selector}`)
  act(() => button.click())
}

beforeEach(() => {
  localStorage.clear()
  QuestManager.reset()
  challengeStore.closeChallenge(false)
  setArraysCampaignStage('practice')
  resumeCalls = []
  unregisterBridge = registerChallengeSceneBridge({
    pausePlayer: () => undefined,
    resumePlayer: (challengeId) => resumeCalls.push(challengeId),
  })
  challengeStore.openChallenge('village-guide-arrays')
})

afterEach(() => {
  if (root) act(() => root?.unmount())
  host?.remove()
  root = undefined
  host = undefined
  if (challengeStore.getSnapshot().activeChallenge) challengeStore.closeChallenge(false)
  unregisterBridge?.()
  unregisterBridge = undefined
  localStorage.clear()
  QuestManager.reset()
  setArraysCampaignStage('learn')
})

describe('Village Guide practice handoff', () => {
  it('opens the Array Workshop in place after the three-question practice quiz', () => {
    const container = render(<QuizChallenge />)

    for (const correctAnswer of [1, 0, 0]) {
      click(container, `[data-testid="guide-practice-answer-${correctAnswer}"]`)
      click(container, '[data-testid="guide-practice-next"]')
    }

    expect(container.querySelector('[data-testid="guide-practice-passed"]')).not.toBeNull()
    expect(getArraysCampaignStage()).toBe('practice')

    click(container, '[data-testid="guide-practice-continue"]')

    expect(challengeStore.getSnapshot().activeChallenge).toBe('array-manipulation-workshop')
    expect(container.querySelector('[data-testid="array-workshop-overlay"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="guide-arrays-overlay"]')).toBeNull()
    expect(challengeStore.getSnapshot().arrayWorkshopStepIndex).toBe(0)
    expect(challengeStore.getSnapshot().arrayWorkshopValues).toEqual([10, 20, 30])
    expect(getArraysCampaignStage()).toBe('implement')
    expect(resumeCalls).toEqual([])
  })
})
