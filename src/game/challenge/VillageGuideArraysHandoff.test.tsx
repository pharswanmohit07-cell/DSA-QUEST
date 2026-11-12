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
    resumePlayer: (challengeId) => resumeCalls.push(challenge¶»§q«^