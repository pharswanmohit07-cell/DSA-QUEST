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

function startPractice(container: HTMLElement): vo¶»§q«^