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

    challengeStore.completeArrayLesson()
    challengeStore.completeArrayLesson()

    expect(audioMocks.playAchievementJingle).toHaveBeenCalledOnce()
  })

  it('plays a random GameOver effect when the quiz reaches zero hearts', () => {
    challengeStore.openChallenge('array-quiz')
    const questions = challengeStore.getSnapshot().quizQuestions

    for (let index = 0; index < 3; index += 1) {
      const question = questions[index]!
      const wrongAnswer = (question.correctAnswerIndex + 1) % question.options.length
      challengeStore.answerQuiz(wrongAnswer)
      if (index < 2) challengeStore.advanceQuiz()
    }

    expect(challengeStore.getSnapshot().quizStatus).toBe('in-progress')
    expect(challengeStore.getSnapshot().heartsRemaining).toBe(0)
    expect(audioMocks.playGameOverJingle).toHaveBeenCalledOnce()

    challengeStore.advanceQuiz()
    expect(challengeStore.getSnapshot().quizStatus).toBe('failed')
  })

  it('plays an achievement jingle when the optional Scroll is passed and restores Adventure', () => {
    challengeStore.openChallenge('array-knowledge-scroll')
    challengeStore.markKnowledgeScrollTrialComplete()
    challengeStore.closeChallenge(true)

    expect(audioMocks.playAchievementJingle).toHaveBeenCalledOnce()
    expect(audioMocks.startAdventureMusic).toHaveBeenCalledOnce()
  })
})
