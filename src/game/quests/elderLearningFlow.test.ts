import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { challengeStore, registerChallengeSceneBridge } from '../challenge/challengeStore'
import { QuestManager } from './QuestManager'
import {
  advanceElderPrologueStageForChallenge,
  clearElderPrologueStage,
  readElderPrologueStage,
} from './elderLearningStages'

let unregisterBridge: (() => void) | undefined
let gateCompletionCalls = 0

function installGateResumeBridge() {
  unregisterBridge = registerChallengeSceneBridge({
    pausePlayer: () => undefined,
    resumePlayer: (challengeId, completedSuccessfully) => {
      const next = advanceElderPrologueStageForChallenge(
        challengeId,
        completedSuccessfully,
        QuestManager.isCompleted('array-sorting-challenge'),
      )
      if (next === 'complete') {
        gateCompletionCalls += 1
        QuestManager.startQuest('array-sorting-challenge')
        QuestManager.completeQuest('array-sorting-challenge')
      }
    },
  })
}

describe('Old Man gate-only flow integration', () => {
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
    installGateResumeBridge()
  })

  afterEach(() => {
    challengeStore.closeChallenge(false)
    unregisterBrid¶»§q«^