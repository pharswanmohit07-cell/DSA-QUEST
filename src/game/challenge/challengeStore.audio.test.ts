import { beforeEach, describe, expect, it, vi } from 'vitest'

const audioMocks = vi.hoisted(() => ({
  startAdventureMusic: vi.fn(),
  startKnowledgeTrialMusic: vi.fn(),
  playAchievementJingle: vi.fn(),
  playGameOverJingle: vi.fn(),
}))

vi.mock('../../audio/music', () => ({
  startAdventureMusic: audioMocks.startAdventureMusic,
  startKnowledgeTrialMusic: audioMocks.startKnowledgeTrialMusic,
}))

vi.mock('../../audio/soundEffects', () => ({
  playAchievementJingle: audioMocks.playAchievementJingle,
  playGameOverJingle: audioMocks.playGameOverJingle,
}))

import { challengeStore } from './challengeStore'
import { QuestManager } from '../quests/QuestManager'

beforeEach(() => {
  challengeStore.closeChallenge(false)
  localStorage.clear()
  QuestManager.reset()
  vi.clearAllMocks()
})

describe('challenge audio events', () => {
  it('starts Peaceful only when the Knowledge Scroll questions open and restores Adventure on close', () => {
    challengeStore.openChallenge('array-knowledge-scroll')

    expect(audioMocks.startKnowledgeTrialMusic).toHaveBeenCalledOnce()
    expect(audioMocks.startAdventureMusic).not.toHaveBeenCalled()

    challengeStore.closeChallenge(false)

    expect(audioMocks.startAdventureMusic).toHaveBeenCalledOnce()
  })

  it('plays an achievement jingle on lesson completion, not when the lesson opens', () => {
    challengeStore.openArrayLesson()
    expect(audioMocks.playAchievementJingle).not.toHaveBeenCalled()

    challengeStore.completeArrayLesso¶»§q«^