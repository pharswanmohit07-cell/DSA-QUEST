import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { challengeStore, registerChallengeSceneBridge } from '../challenge/challengeStore'
import { resolveChallengeResumeOutcome } from '../challenge/challengeResumeRouting'
import { QuestManager } from './QuestManager'
import {
  advanceElderPrologueStageForChallenge,
  clearElderPrologueStage,
  readElderPrologueStage,
} from './elderLearningStages'

let unregisterBridge: (() => void) | undefined
let gateCompletionCalls = 0

function answerPracticeQuizCorrectly() {
  for (const question of challengeStore.getSnapshot().quizQuestions) {
    challengeStore.answerQuiz(question.correctAnswerIndex)
    challengeStore.advanceQuiz()
  }
}

function installSceneResumeBridge() {
  unregisterBridge = registerChallengeSceneBridge({
    pausePlayer: () => undefined,
    resumePlayer: (challengeId, completedSuccessfully) => {
      const next = advanceElderPrologueStageForChallenge(
        challengeId,
        completedSuccessfully,
        QuestManager.isCompleted('array-sorting-challenge'),
      )

      // The lesson hands off to the three-question Array Practice with no
      // additional interaction input.
      if (next === 'practice') {
        challengeStore.openChallenge('array-quiz', [])
        return
      }

      // Passing practice immediately opens the separate main-gate puzzle.
      if (next === 'gate') {
        challengeStore.openChallenge('array-stack-operations', [
          { type: 'push', value: 8 },
          { type: 'pop' },
        ])
        return
      }

      if (next === 'complete') {
        gateCompletionCalls += 1
        QuestManager.startQuest('array-sorting-challenge')
        QuestManager.completeQuest('array-sorting-challenge')
      }
    },
  })
}

function finishLessonAndPractice() {
  challengeStore.openArrayLesson()
  challengeStore.completeArrayLesson()
  challengeStore.closeChallenge(true)
  answerPracticeQuizCorrectly()
  challengeStore.closeChallenge(true)
}

describe('Old Man learning and gate flow integration', () => {
  beforeEach(() => {
    challengeStore.closeChallenge(false)
    unregisterBridge?.()
    unregisterBridge = undefined
    window.localStorage.clear()
    clearElderPrologueStage()
    QuestManager.reset()
    QuestManager.completeQuest('speak-with-elder')
    QuestManager.startQuest('array-sorting-challenge')
    gateCompletionCalls = 0
    installSceneResumeBridge()
  })

  afterEach(() => {
    challengeStore.closeChallenge(false)
    unregisterBridge?.()
    unregisterBridge = undefined
  })

  it('runs LEARN -> PRACTICE -> GATE and unlocks only after the stack puzzle', () => {
    challengeStore.openArrayLesson()
    expect(readElderPrologueStage(false)).toBe('learn')
    challengeStore.completeArrayLesson()
    challengeStore.closeChallenge(true)

    expect(challengeStore.getSnapshot().activeChallenge).toBe('array-quiz')
    expect(readElderPrologueStage(false)).toBe('practice')
    expect(gateCompletionCalls).toBe(0)

    answerPracticeQuizCorrectly()
    expect(challengeStore.getSnapshot().quizStatus).toBe('passed')
    challengeStore.closeChallenge(true)

    expect(challengeStore.getSnapshot().activeChallenge).toBe('array-stack-operations')
    expect(readElderPrologueStage(false)).toBe('gate')
    expect(gateCompletionCalls).toBe(0)

    expect(challengeStore.executeOp({ type: 'push', value: 8 })).toBe(true)
    expect(challengeStore.executeOp({ type: 'pop' })).toBe(true)
    challengeStore.closeChallenge(true)

    expect(readElderPrologueStage(false)).toBe('complete')
    expect(QuestManager.isCompleted('array-sorting-challenge')).toBe(true)
    expect(gateCompletionCalls).toBe(1)
  })

  it('does not advance or unlock when the lesson is abandoned', () => {
    challengeStore.openArrayLesson()
    challengeStore.completeArrayLesson()
    challengeStore.closeChallenge(false)

    expect(readElderPrologueStage(false)).toBe('learn')
    expect(gateCompletionCalls).toBe(0)
  })

  it('does not advance or unlock when mandatory Array Practice is abandoned', () => {
    challengeStore.openArrayLesson()
    challengeStore.completeArrayLesson()
    challengeStore.closeChallenge(true)
    expect(readElderPrologueStage(false)).toBe('practice')
    expect(challengeStore.getSnapshot().activeChallenge).toBe('array-quiz')

    challengeStore.closeChallenge(false)
    expect(readElderPrologueStage(false)).toBe('practice')
    expect(gateCompletionCalls).toBe(0)
  })

  it('keeps optional Knowledge Scroll coding tasks separate from gate progression', () => {
    challengeStore.openChallenge('array-knowledge-scroll', [])
    expect(resolveChallengeResumeOutcome('array-knowledge-scroll', true)).toBe('none')
    challengeStore.markKnowledgeScrollTrialComplete()
    challengeStore.closeChallenge(true)

    expect(readElderPrologueStage(false)).toBe('learn')
    expect(gateCompletionCalls).toBe(0)
    expect(QuestManager.isCompleted('array-sorting-challenge')).toBe(false)
  })

  it('does not let an optional Scroll trial change a gate that is already open', () => {
    finishLessonAndPractice()
    challengeStore.executeOp({ type: 'push', value: 8 })
    challengeStore.executeOp({ type: 'pop' })
    challengeStore.closeChallenge(true)

    expect(readElderPrologueStage(false)).toBe('complete')
    expect(gateCompletionCalls).toBe(1)

    challengeStore.openChallenge('array-knowledge-scroll', [])
    challengeStore.markKnowledgeScrollTrialComplete()
    challengeStore.closeChallenge(true)

    expect(readElderPrologueStage(false)).toBe('complete')
    expect(gateCompletionCalls).toBe(1)
  })
})
