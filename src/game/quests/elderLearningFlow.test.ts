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
          { type: 'push', val¶»§q«^