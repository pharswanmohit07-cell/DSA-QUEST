import { beforeEach, describe, expect, it } from 'vitest'
import {
  challengeStore,
  registerChallengeSceneBridge,
  VILLAGE_TRAINING_TRIAL_PASS_THRESHOLD,
  VILLAGE_TRAINING_TRIAL_QUESTIONS,
} from './challengeStore'
import { getSeenArrayQuizQuestionIds } from './challengeStore'
import { resolveChallengeResumeOutcome } from './challengeResumeRouting'
import { QuestManager } from '../quests/QuestManager'

describe('Elder gate prologue isolation', () => {
  beforeEach(() => {
    localStorage.clear()
    challengeStore.closeChallenge(false)
    QuestManager.reset()
  })

  it('reports a passed final quiz through the resume bridge without formal topic rewards', () => {
    const { resumeCalls, unregister } = useMockBridge()
    challengeStore.openChallenge('array-quiz', [])

    expect(QuestManager.getCampaign().topics.arrays.status).toBe('available')
    expect(QuestManager.getCampaign().topics['stack-operations'].status).toBe('locked')
    expect(QuestManager.getCampaign().xp).toBe(0)

    for (const question of challengeStore.getSnapshot().quizQuestions) {
      challengeStore.answerQuiz(question.correctAnswerIndex)
      challengeStore.advanceQuiz()
    }

    expect(challengeStore.getSnapshot().quizStatus).toBe('passed')
    challengeStore.closeChallenge(true)
    unregister()

    expect(resumeCalls).toEqual([
      { challengeId: 'array-quiz', completedSuccessfully: true },
    ])
    expect(QuestManager.getCampaign().topics.arrays.status).toBe('available')
    expect(¶»§q«^