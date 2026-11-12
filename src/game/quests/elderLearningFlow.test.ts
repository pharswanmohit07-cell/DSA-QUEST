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
    unregisterBridge?.()
    unregisterBridge = undefined
  })

  it('opens only the stack gate trial and unlocks after its full operation sequence', () => {
    expect(readElderPrologueStage(false)).toBe('gate')
    challengeStore.openChallenge('array-stack-operations', [
      { type: 'push', value: 8 },
      { type: 'pop' },
    ])
    expect(challengeStore.getSnapshot().activeChallenge).toBe('array-stack-operations')

    expect(challengeStore.executeOp({ type: 'push', value: 8 })).toBe(true)
    expect(challengeStore.executeOp({ type: 'pop' })).toBe(true)
    challengeStore.closeChallenge(true)

    expect(challengeStore.getSnapshot().activeChallenge).toBeNull()
    expect(readElderPrologueStage(false)).toBe('complete')
    expect(QuestManager.isCompleted('array-sorting-challenge')).toBe(true)
    expect(gateCompletionCalls).toBe(1)
  })

  it('does not advance or unlock when the gate trial is abandoned', () => {
    challengeStore.openChallenge('array-stack-operations', [
      { type: 'push', value: 8 },
      { type: 'pop' },
    ])
    challengeStore.executeOp({ type: 'push', value: 8 })
    challengeStore.closeChallenge(false)

    expect(readElderPrologueStage(false)).toBe('gate')
    expect(QuestManager.isCompleted('array-sorting-challenge')).toBe(false)
    expect(gateCompletionCalls).toBe(0)
  })

  it('keeps the optional Guide Knowledge Scroll separate from gate progression', () => {
    challengeStore.openChallenge('array-knowledge-scroll', [])
    challengeStore.markKnowledgeScrollTrialComplete()
    challengeStore.closeChallenge(true)

    expect(readElderPrologueStage(false)).toBe('gate')
    expect(QuestManager.isCompleted('array-sorting-challenge')).toBe(false)
    expect(gateCompletionCalls).toBe(0)
  })
})
