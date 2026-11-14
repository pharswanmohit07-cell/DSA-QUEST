import { beforeEach, describe, expect, it } from 'vitest'
import { challengeStore } from './challengeStore'
import { STACK_QUESTION_BANK } from './questionBank'
import { SAMURAI_GUIDED_STEPS } from './samuraiStackChallenge'
import { QuestManager } from '../quests/QuestManager'

function unlockArrays() {
  expect(QuestManager.startTopic('arrays')).toBe(true)
  expect(QuestManager.completeTopic('arrays', {
    passed: true,
    masteryGrade: 'S',
    hintsUsed: 0,
  })).toBe(true)
}

function openStackQuiz() {
  expect(challengeStore.openSamuraiStackLesson()).toBe(true)
  challengeStore.advanceSamuraiStackLesson()
  challengeStore.advanceSamuraiStackLesson()
  challengeStore.advanceSamuraiStackLesson()
  expect(challengeStore.getSnapshot().activeChallenge).toBe('samurai-stack-quiz')
}

function passStackQuiz() {
  for (const question of challengeStore.getSnapshot().quizQuestions) {
    challengeStore.answerSamuraiStackQuiz(question.correctAnswerIndex)
    challengeStore.advanceSamuraiStackQuiz()
  }
  expect(challengeStore.getSnapshot().activeChallenge).toBe('samurai-stack-dojo')
}

describe('Samurai Stack Operations campaign flow', () => {
  beforeEach(() => {
    challengeStore.closeChallenge(false)
    localStorage.clear()
    QuestManager.reset()
  })

  it('remains locked until Arrays is completed', () => {
    expect(challengeStore.openSamuraiStackLesson()).toBe(false)
    expect(challengeStore.getSnapshot().activeChallenge).toBeNull()
    expect(QuestManager.getCampaign().topics['stack-operations'].status).toBe('locked')
  })

  it('opens the Samurai lesson and moves to a randomized topic-scoped quiz', () => {
    unlockArrays()
    openStackQuiz()
    const questions = challengeStore.getSnapshot().quizQuestions
    expect(questions).toHaveLength(3)
    expect(questions.every((question) => STACK_QUESTION_BANK.some((entry) => entry.id === question.id))).toBe(true)
    expect(questions.map((question) => question.difficulty)).toEqual(['easy', 'medium', 'hard'])
    expect(QuestManager.getCampaign().topics['stack-operations'].status).toBe('in-progress')
    expect(QuestManager.getCampaign().topics['stack-operations'].attemptCount).toBe(1)
  })

  it('does not consume Stack question IDs when the quiz is abandoned', () => {
    unlockArrays()
    openStackQuiz()
    challengeStore.answerSamuraiStackQuiz(challengeStore.getSnapshot().quizQuestions[0]!.correctAnswerIndex)
    challengeStore.closeChallenge(false)
    expect(localStorage.getItem('dsa-quest-stack-quiz-history-v1')).toBeNull()
    expect(QuestManager.getCampaign().topics['stack-operations'].status).toBe('in-progress')
    expect(QuestManager.getCampaign().xp).toBe(50)
  })

  it('records a failed quiz and lets the player retry with fresh questions', () => {
    unlockArrays()
    openStackQuiz()
    const firstAttempt = challengeStore.getSnapshot().quizQuestions.map((question) => question.id)
    for (const question of challengeStore.getSnapshot().quizQuestions) {
      challengeStore.answerSamuraiStackQuiz((question.correctAnswerIndex + 1) % question.options.length)
      challengeStore.advanceSamuraiStackQuiz()
    }
    expect(challengeStore.getSnapshot().quizStatus).toBe('failed')
    expect(JSON.parse(localStorage.getItem('dsa-quest-stack-quiz-history-v1') ?? '[]')).toEqual(firstAttempt)

    challengeStore.retrySamuraiStackQuiz()
    const retryIds = challengeStore.getSnapshot().quizQuestions.map((question) => question.id)
    expect(retryIds.every((id) => !firstAttempt.includes(id))).toBe(true)
    expect(challengeStore.getSnapshot().heartsRemaining).toBe(3)
  })

  it('does not award a relic or XP when the quiz passes without the Dojo objective', () => {
    unlockArrays()
    openStackQuiz()
    passStackQuiz()
    const campaign = QuestManager.getCampaign()
    expect(campaign.topics['stack-operations'].status).toBe('in-progress')
    expect(campaign.relicEntitlements).not.toContain('stack-relic')
    expect(campaign.xp).toBe(50)
  })

  it('completes the Stack topic only after recovering Lotus with Peek and Pop', () => {
    unlockArrays()
    openStackQuiz()
    passStackQuiz()

    for (const step of SAMURAI_GUIDED_STEPS) {
      challengeStore.executeSamuraiStackAction(step.action)
    }
    challengeStore.enterSamuraiStackPractice()
    challengeStore.beginSamuraiStackFinalTrial()

    challengeStore.executeSamuraiStackAction({ type: 'pop' })
    challengeStore.executeSamuraiStackAction({ type: 'pop' })
    expect(challengeStore.getSnapshot().samuraiStackProgress?.stack).toEqual(['phoenix', 'lotus'])
    challengeStore.executeSamuraiStackAction({ type: 'peek' })
    challengeStore.executeSamuraiStackAction({ type: 'pop' })
    expect(challengeStore.getSnapshot().samuraiStackProgress?.completed).toBe(true)

    challengeStore.closeChallenge(true)
    const campaign = QuestManager.getCampaign()
    expect(campaign.topics['stack-operations'].status).toBe('completed')
    expect(campaign.relicEntitlements).toContain('stack-relic')
    expect(campaign.firstCompletionRewardClaims).toContain('stack-operations')
    expect(campaign.xp).toBe(100)
    expect(campaign.topics.queues.status).toBe('available')
  })

  it('rejects a success close while the Dojo final objective is incomplete', () => {
    unlockArrays()
    openStackQuiz()
    passStackQuiz()
    challengeStore.closeChallenge(true)
    const campaign = QuestManager.getCampaign()
    expect(campaign.topics['stack-operations'].status).toBe('in-progress')
    expect(campaign.relicEntitlements).not.toContain('stack-relic')
    expect(campaign.xp).toBe(50)
  })
})
