import { beforeEach, describe, expect, it } from 'vitest'
import { challengeStore } from './challengeStore'
import { QuestManager } from '../quests/QuestManager'

describe('challenge campaign integration', () => {
  beforeEach(() => {
    localStorage.clear()
    challengeStore.closeChallenge(false)
    QuestManager.reset()
  })

  it('records quiz answers and completes Arrays with its mastery grade', () => {
    challengeStore.openChallenge('array-quiz', [{ type: 'push', value: 7 }])
    let challenge = challengeStore.getSnapshot()

    expect(QuestManager.getCampaign().topics.arrays.status).toBe('in-progress')
    for (let index = 0; index < challenge.quizQuestions.length; index += 1) {
      const question = challenge.quizQuestions[index]
      const answerIndex = index === 1
        ? (question.correctAnswerIndex + 1) % question.options.length
        : question.correctAnswerIndex
      challengeStore.answerQuiz(answerIndex)
      challengeStore.advanceQuiz()
    }

    challenge = challengeStore.getSnapshot()
    expect(challenge.correctAnswers).toBe(2)
    expect(challenge.quizStatus).toBe('passed')
    expect(QuestManager.getCampaign().topics.arrays.status).toBe('completed')
    expect(QuestManager.getCampaign().topics.arrays.bestMasteryGrade).toBe('A')
    expect(QuestManager.getCampaign().topics['stack-operations'].status).toBe('available')
    expect(QuestManager.getCampaign().xp).toBe(50)

    challengeStore.beginStackPractice()
    expect(QuestManager.getCampaign().topics['stack-operations'].status).toBe('in-progress')
  })

  it('releases Arrays for retry after a failed quiz without rewards', () => {
    challengeStore.openChallenge('array-quiz', [{ type: 'push', value: 7 }])
    const questions = challengeStore.getSnapshot().quizQuestions

    for (const question of questions) {
      const wrongAnswer = (question.correctAnswerIndex + 1) % question.options.length
      challengeStore.answerQuiz(wrongAnswer)
      challengeStore.advanceQuiz()
    }

    expect(challengeStore.getSnapshot().quizStatus).toBe('failed')
    expect(challengeStore.getSnapshot().correctAnswers).toBe(0)
    expect(QuestManager.getCampaign().topics.arrays.status).toBe('available')
    expect(QuestManager.getCampaign().xp).toBe(0)
  })

  it('tracks rejected stack operations and grades a successful attempt', () => {
    const target = [{ type: 'push', value: 7 }] as const
    challengeStore.openChallenge('array-quiz', target)
    const questions = challengeStore.getSnapshot().quizQuestions
    for (const question of questions) {
      challengeStore.answerQuiz(question.correctAnswerIndex)
      challengeStore.advanceQuiz()
    }
    challengeStore.beginStackPractice()
    challengeStore.executeOp({ type: 'push', value: 8 })
    challengeStore.executeOp({ type: 'pop' })
    challengeStore.executeOp({ type: 'push', value: 8 })
    challengeStore.executeOp({ type: 'push', value: 7 })

    expect(challengeStore.getSnapshot().incorrectOperations).toBe(3)
    expect(challengeStore.getSnapshot().isComplete).toBe(true)
    challengeStore.closeChallenge(true)

    expect(QuestManager.getCampaign().topics['stack-operations'].status).toBe('completed')
    expect(QuestManager.getCampaign().topics['stack-operations'].bestMasteryGrade).toBe('C')
    expect(QuestManager.getCampaign().topics.queues.status).toBe('available')
    expect(QuestManager.getCampaign().xp).toBe(100)
  })

  it('completes Stack Operations when the sequence succeeds with a D grade', () => {
    challengeStore.openChallenge('array-quiz', [{ type: 'push', value: 7 }])
    for (const question of challengeStore.getSnapshot().quizQuestions) {
      challengeStore.answerQuiz(question.correctAnswerIndex)
      challengeStore.advanceQuiz()
    }
    challengeStore.beginStackPractice()

    challengeStore.executeOp({ type: 'push', value: 8 })
    challengeStore.executeOp({ type: 'push', value: 8 })
    challengeStore.executeOp({ type: 'push', value: 8 })
    challengeStore.executeOp({ type: 'push', value: 8 })
    challengeStore.executeOp({ type: 'push', value: 7 })

    expect(challengeStore.getSnapshot().incorrectOperations).toBe(4)
    expect(challengeStore.getSnapshot().isComplete).toBe(true)
    challengeStore.closeChallenge(true)

    expect(QuestManager.getCampaign().topics['stack-operations'].status).toBe('completed')
    expect(QuestManager.getCampaign().topics['stack-operations'].bestMasteryGrade).toBe('D')
    expect(QuestManager.getCampaign().topics.queues.status).toBe('available')
    expect(QuestManager.getCampaign().xp).toBe(100)
  })

  it('allows Stack Operations to be started directly after Arrays is completed', () => {
    expect(QuestManager.startTopic('arrays')).toBe(true)
    expect(QuestManager.completeTopic('arrays', {
      passed: true,
      masteryGrade: 'S',
      hintsUsed: 0,
    })).toBe(true)

    challengeStore.openChallenge('array-stack-operations', [{ type: 'push', value: 7 }])

    expect(challengeStore.getSnapshot().activeChallenge).toBe('array-stack-operations')
    expect(QuestManager.getCampaign().topics['stack-operations'].status).toBe('in-progress')
  })

  it('makes an abandoned Stack Operations attempt retryable without rewards', () => {
    expect(QuestManager.startTopic('arrays')).toBe(true)
    expect(QuestManager.completeTopic('arrays', {
      passed: true,
      masteryGrade: 'S',
      hintsUsed: 0,
    })).toBe(true)
    challengeStore.openChallenge('array-stack-operations', [{ type: 'push', value: 7 }])
    challengeStore.closeChallenge(false)

    expect(QuestManager.getCampaign().topics['stack-operations'].status).toBe('available')
    expect(QuestManager.getCampaign().xp).toBe(50)
    expect(QuestManager.getCampaign().relicEntitlements).toEqual(['array-relic'])
  })
})
