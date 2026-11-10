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

  it('keeps a passed Elder Array quiz outside formal Arrays campaign rewards', () => {
    challengeStore.openChallenge('array-quiz', [{ type: 'push', value: 7 }])
    let challenge = challengeStore.getSnapshot()

    expect(QuestManager.getCampaign().topics.arrays.status).toBe('available')
    expect(QuestManager.getCampaign().topics['stack-operations'].status).toBe('locked')
    expect(QuestManager.getCampaign().xp).toBe(0)

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
    expect(QuestManager.getCampaign().topics.arrays.status).toBe('available')
    expect(QuestManager.getCampaign().topics['stack-operations'].status).toBe('locked')
    expect(QuestManager.getCampaign().relicEntitlements).toEqual([])
    expect(QuestManager.getCampaign().xp).toBe(0)

    challengeStore.beginStackPractice()
    expect(challengeStore.getSnapshot().activeChallenge).toBe('array-stack-operations')
    expect(QuestManager.getCampaign().topics.arrays.status).toBe('available')
    expect(QuestManager.getCampaign().topics['stack-operations'].status).toBe('locked')
  })

  it('keeps a failed Elder prologue quiz outside campaign progress and rewards', () => {
    challengeStore.openChallenge('array-quiz')
    const questions = challengeStore.getSnapshot().quizQuestions

    for (const question of questions) {
      const wrongAnswer = (question.correctAnswerIndex + 1) % question.options.length
      challengeStore.answerQuiz(wrongAnswer)
      challengeStore.advanceQuiz()
    }

    expect(challengeStore.getSnapshot().quizStatus).toBe('failed')
    expect(challengeStore.getSnapshot().correctAnswers).toBe(0)
    expect(QuestManager.getCampaign().topics.arrays.status).toBe('available')
    expect(QuestManager.getCampaign().topics['stack-operations'].status).toBe('locked')
    expect(QuestManager.getCampaign().xp).toBe(0)
    expect(QuestManager.getCampaign().relicEntitlements).toEqual([])
  })

  it('keeps successful Elder Stack practice on the gate bridge and out of topic rewards', () => {
    const { resumeCalls, unregister } = useMockBridge()
    challengeStore.openChallenge('array-quiz')
    for (const question of challengeStore.getSnapshot().quizQuestions) {
      challengeStore.answerQuiz(question.correctAnswerIndex)
      challengeStore.advanceQuiz()
    }
    challengeStore.beginStackPractice()

    challengeStore.executeOp({ type: 'push', value: 7 })
    expect(challengeStore.getSnapshot().isComplete).toBe(true)
    challengeStore.closeChallenge(true)
    unregister()

    expect(resumeCalls).toEqual([
      { challengeId: 'array-stack-operations', completedSuccessfully: true },
    ])
    expect(QuestManager.getCampaign().topics.arrays.status).toBe('available')
    expect(QuestManager.getCampaign().topics['stack-operations'].status).toBe('locked')
    expect(QuestManager.getCampaign().xp).toBe(0)
    expect(QuestManager.getCampaign().relicEntitlements).toEqual([])
  })

  it('does not report a successful Elder Stack practice before its target sequence is complete', () => {
    const { resumeCalls, unregister } = useMockBridge()
    challengeStore.openChallenge('array-stack-operations', [{ type: 'push', value: 7 }])
    challengeStore.closeChallenge(true)
    unregister()

    expect(resumeCalls).toEqual([
      { challengeId: 'array-stack-operations', completedSuccessfully: false },
    ])
    expect(QuestManager.getCampaign().topics['stack-operations'].status).toBe('locked')
    expect(QuestManager.getCampaign().xp).toBe(0)
  })

  it('does not consume Array quiz IDs when the quiz opens or is abandoned', () => {
    challengeStore.openChallenge('array-quiz')
    expect(getSeenArrayQuizQuestionIds()).toEqual([])
    expect(localStorage.getItem('dsa-quest-array-quiz-history-v1')).toBeNull()
    expect(localStorage.getItem('dsa-quest-array-quiz-last-first-v1')).toBeNull()

    challengeStore.answerQuiz(challengeStore.getSnapshot().quizQuestions[0].correctAnswerIndex)
    challengeStore.closeChallenge(false)

    expect(getSeenArrayQuizQuestionIds()).toEqual([])
    expect(localStorage.getItem('dsa-quest-array-quiz-history-v1')).toBeNull()
    expect(localStorage.getItem('dsa-quest-array-quiz-last-first-v1')).toBeNull()
  })

  it('commits Array quiz IDs only when a pass or fail reaches a terminal result', () => {
    challengeStore.openChallenge('array-quiz')
    const passedIds = challengeStore.getSnapshot().quizQuestions.map((question) => question.id)
    for (const question of challengeStore.getSnapshot().quizQuestions) {
      challengeStore.answerQuiz(question.correctAnswerIndex)
      challengeStore.advanceQuiz()
    }

    expect(challengeStore.getSnapshot().quizStatus).toBe('passed')
    expect(new Set(getSeenArrayQuizQuestionIds())).toEqual(new Set(passedIds))

    challengeStore.openChallenge('array-quiz')
    const nextIds = challengeStore.getSnapshot().quizQuestions.map((question) => question.id)
    expect(nextIds.some((id) => passedIds.includes(id))).toBe(false)
    for (const question of challengeStore.getSnapshot().quizQuestions) {
      challengeStore.answerQuiz((question.correctAnswerIndex + 1) % question.options.length)
      challengeStore.advanceQuiz()
    }

    expect(challengeStore.getSnapshot().quizStatus).toBe('failed')
    expect(new Set(getSeenArrayQuizQuestionIds())).toEqual(new Set([...passedIds, ...nextIds]))
  })
})

/** Bridges a mock scene bridge and returns the resume calls it recorded. */
function useMockBridge() {
  const resumeCalls: Array<{ challengeId: string; completedSuccessfully: boolean }> = []
  const pauseCalls: number[] = []
  const unregister = registerChallengeSceneBridge({
    pausePlayer: () => pauseCalls.push(1),
    resumePlayer: (challengeId, completedSuccessfully) => {
      resumeCalls.push({ challengeId, completedSuccessfully })
    },
  })
  return { resumeCalls, pauseCalls, unregister }
}

/** Answer all trial questions using the supplied index chooser per question. */
function answerTrial(choose: (index: number, correctIndex: number) => number) {
  const questions = challengeStore.getSnapshot().quizQuestions
  for (let index = 0; index < questions.length; index += 1) {
    challengeStore.answerTrialQuestion(choose(index, questions[index].correctAnswerIndex))
    challengeStore.advanceTrialQuestion()
  }
}

describe('village training trial (Samurai)', () => {
  beforeEach(() => {
    localStorage.clear()
    challengeStore.closeChallenge(false)
    QuestManager.reset()
  })

  it('opens with exactly three fixed questions and never starts a campaign topic', () => {
    expect(VILLAGE_TRAINING_TRIAL_QUESTIONS).toHaveLength(3)
    const before = QuestManager.getSnapshot()

    challengeStore.openChallenge('village-training-trial')

    const challenge = challengeStore.getSnapshot()
    expect(challenge.activeChallenge).toBe('village-training-trial')
    expect(challenge.quizQuestions).toHaveLength(3)
    expect(challenge.quizQuestions.map((question) => question.id)).toEqual(
      VILLAGE_TRAINING_TRIAL_QUESTIONS.map((question) => question.id),
    )
    expect(challenge.heartsRemaining).toBe(3)
    expect(challenge.quizStatus).toBe('in-progress')
    // No campaign topic may have been started by the trial.
    expect(QuestManager.getSnapshot().xp).toBe(before.xp)
    expect(QuestManager.getCampaign().topics.arrays.status).toBe('available')
    expect(QuestManager.getCampaign().topics['stack-operations'].status).toBe('locked')
  })

  it('passes with two correct answers and fails with one', () => {
    // 2/3: pass.
    challengeStore.openChallenge('village-training-trial')
    answerTrial((index, correctIndex) => (index === 1 ? (correctIndex + 1) % 4 : correctIndex))
    expect(challengeStore.getSnapshot().quizStatus).toBe('passed')
    expect(challengeStore.getSnapshot().correctAnswers).toBe(2)
    challengeStore.closeChallenge(false)

    // 1/3: fail.
    challengeStore.openChallenge('village-training-trial')
    answerTrial((index, correctIndex) => (index === 0 ? correctIndex : (correctIndex + 1) % 4))
    expect(challengeStore.getSnapshot().quizStatus).toBe('failed')
    expect(challengeStore.getSnapshot().correctAnswers).toBe(1)
    challengeStore.closeChallenge(false)

    expect(VILLAGE_TRAINING_TRIAL_PASS_THRESHOLD).toBe(2)
  })

  it('gives per-answer feedback with explanations', () => {
    challengeStore.openChallenge('village-training-trial')
    challengeStore.answerTrialQuestion((1 + VILLAGE_TRAINING_TRIAL_QUESTIONS[0].correctAnswerIndex) % 4)
    expect(challengeStore.getSnapshot().feedback?.isError).toBe(true)
    expect(challengeStore.getSnapshot().feedback?.message).toMatch(/correct answer is 1/i)
    challengeStore.advanceTrialQuestion()
    challengeStore.answerTrialQuestion(VILLAGE_TRAINING_TRIAL_QUESTIONS[1].correctAnswerIndex)
    expect(challengeStore.getSnapshot().feedback?.isError).toBe(false)
  })

  it('does not write to the Array quiz history or last-first keys', () => {
    challengeStore.openChallenge('village-training-trial')
    answerTrial((_, correctIndex) => correctIndex)
    challengeStore.closeChallenge(true)

    expect(localStorage.getItem('dsa-quest-array-quiz-history-v1')).toBeNull()
    expect(localStorage.getItem('dsa-quest-array-quiz-last-first-v1')).toBeNull()
    expect(getSeenArrayQuizQuestionIds()).toEqual([])
  })

  it('does not change campaign attempts, grades, relics, or reward claims', () => {
    const before = QuestManager.getCampaign()
    const beforeSnapshot = QuestManager.getSnapshot()

    challengeStore.openChallenge('village-training-trial')
    answerTrial((_, correctIndex) => correctIndex)
    challengeStore.closeChallenge(true)

    expect(QuestManager.getCampaign().topics).toEqual(before.topics)
    expect(QuestManager.getCampaign().relicEntitlements).toEqual(before.relicEntitlements)
    expect(QuestManager.getCampaign().firstCompletionRewardClaims).toEqual(before.firstCompletionRewardClaims)
    expect(QuestManager.getSnapshot().xp).toBe(beforeSnapshot.xp)
    expect(QuestManager.getCampaign().finalMasteryGrade).toBe(before.finalMasteryGrade)
  })

  it('routes trial results through the side-quest stage and never the gate path', () => {
    // Seed an eligible campaign and accept the route so the trial pass can be
    // recorded through the normal side-quest state machine.
    expect(QuestManager.startTopic('arrays')).toBe(true)
    expect(QuestManager.completeTopic('arrays', { passed: true, masteryGrade: 'S', hintsUsed: 0 })).toBe(true)
    expect(QuestManager.startTopic('stack-operations')).toBe(true)
    expect(QuestManager.completeTopic('stack-operations', { passed: true, masteryGrade: 'S', hintsUsed: 0 })).toBe(true)
    expect(QuestManager.acceptVillageTrainingRoute()).toBe('started')
    expect(QuestManager.acknowledgeVillageMonk()).toBe('visited')

    const { resumeCalls, unregister } = useMockBridge()
    challengeStore.openChallenge('village-training-trial')
    answerTrial((_, correctIndex) => correctIndex)
    expect(challengeStore.getSnapshot().quizStatus).toBe('passed')
    challengeStore.closeChallenge(true)
    unregister()

    // The scene (MainScene.resumePlayerAfterChallenge) performs the side-quest
    // recording when it receives the trial-pass resume; the store itself never
    // touches quest state. Simulate that scene step here.
    expect(resumeCalls).toEqual([{ challengeId: 'village-training-trial', completedSuccessfully: true }])
    expect(QuestManager.recordVillageTrainingTrialPass()).toBe('visited')
    expect(QuestManager.getSnapshot().villageTrainingRoute.stage).toBe('return-guide')
    // The gate stays locked: no campaign completion was triggered.
    expect(QuestManager.isCompleted('array-sorting-challenge')).toBe(false)
  })

  it('leaves the stage at visit-samurai after a failed trial', () => {
    expect(QuestManager.startTopic('arrays')).toBe(true)
    expect(QuestManager.completeTopic('arrays', { passed: true, masteryGrade: 'S', hintsUsed: 0 })).toBe(true)
    expect(QuestManager.startTopic('stack-operations')).toBe(true)
    expect(QuestManager.completeTopic('stack-operations', { passed: true, masteryGrade: 'S', hintsUsed: 0 })).toBe(true)
    expect(QuestManager.acceptVillageTrainingRoute()).toBe('started')
    expect(QuestManager.acknowledgeVillageMonk()).toBe('visited')

    challengeStore.openChallenge('village-training-trial')
    answerTrial((_, correctIndex) => (correctIndex + 1) % 4)
    challengeStore.closeChallenge(false)

    expect(QuestManager.getSnapshot().villageTrainingRoute.stage).toBe('visit-samurai')
    expect(QuestManager.getSnapshot().villageTrainingRoute.rewardClaimed).toBe(false)
  })

  it('is retryable after a failed trial', () => {
    challengeStore.openChallenge('village-training-trial')
    answerTrial((_, correctIndex) => (correctIndex + 1) % 4)
    expect(challengeStore.getSnapshot().quizStatus).toBe('failed')
    challengeStore.closeChallenge(false)
    expect(challengeStore.getSnapshot().activeChallenge).toBeNull()

    challengeStore.openChallenge('village-training-trial')
    expect(challengeStore.getSnapshot().quizStatus).toBe('in-progress')
    expect(challengeStore.getSnapshot().currentQuestionIndex).toBe(0)
    expect(challengeStore.getSnapshot().correctAnswers).toBe(0)
  })

  it('ignores closeChallenge(true) claimed before the trial reaches passed', () => {
    // Seed an eligible campaign so a bogus success would otherwise advance
    // the side quest; the store itself must refuse to report one.
    expect(QuestManager.startTopic('arrays')).toBe(true)
    expect(QuestManager.completeTopic('arrays', { passed: true, masteryGrade: 'S', hintsUsed: 0 })).toBe(true)
    expect(QuestManager.startTopic('stack-operations')).toBe(true)
    expect(QuestManager.completeTopic('stack-operations', { passed: true, masteryGrade: 'S', hintsUsed: 0 })).toBe(true)
    expect(QuestManager.acceptVillageTrainingRoute()).toBe('started')
    expect(QuestManager.acknowledgeVillageMonk()).toBe('visited')

    const { resumeCalls, unregister } = useMockBridge()
    challengeStore.openChallenge('village-training-trial')

    // Claim success mid-trial: one question answered, none finished.
    challengeStore.answerTrialQuestion(VILLAGE_TRAINING_TRIAL_QUESTIONS[0].correctAnswerIndex)
    challengeStore.closeChallenge(true)

    expect(resumeCalls).toEqual([{ challengeId: 'village-training-trial', completedSuccessfully: false }])
    // The scene therefore never gets a trial-pass outcome and the stage stays
    // at visit-samurai.
    expect(QuestManager.getSnapshot().villageTrainingRoute.stage).toBe('visit-samurai')
    expect(QuestManager.getSnapshot().villageTrainingRoute.rewardClaimed).toBe(false)
    unregister()
  })

  it('ignores closeChallenge(true) on an untouched trial', () => {
    challengeStore.openChallenge('village-training-trial')
    const { resumeCalls, unregister } = useMockBridge()
    challengeStore.closeChallenge(true)
    unregister()
    expect(resumeCalls).toEqual([{ challengeId: 'village-training-trial', completedSuccessfully: false }])
  })

  it('keeps the trial isolated from concurrent campaign challenge state', () => {
    challengeStore.openChallenge('array-quiz', [{ type: 'push', value: 7 }])
    // openChallenge while one is already active must be ignored.
    challengeStore.openChallenge('village-training-trial')
    expect(challengeStore.getSnapshot().activeChallenge).toBe('array-quiz')
    challengeStore.closeChallenge(false)
    expect(challengeStore.getSnapshot().activeChallenge).toBeNull()
  })
})

describe('challenge resume routing (gate-unlock protection)', () => {
  it('routes only a successful stack practice to the campaign completion path', () => {
    expect(resolveChallengeResumeOutcome('array-stack-operations', true)).toBe('campaign-complete')
    expect(resolveChallengeResumeOutcome('array-stack-operations', false)).toBe('none')
  })

  it('routes trial results to side-quest outcomes only', () => {
    expect(resolveChallengeResumeOutcome('village-training-trial', true)).toBe('trial-pass')
    expect(resolveChallengeResumeOutcome('village-training-trial', false)).toBe('trial-fail')
  })

  it('never routes the array quiz or unknown closes to campaign completion', () => {
    expect(resolveChallengeResumeOutcome('array-quiz', true)).toBe('none')
    expect(resolveChallengeResumeOutcome('array-quiz', false)).toBe('none')
  })

  it('reports the captured challenge id to the bridge on close', () => {
    const { resumeCalls } = useMockBridge()
    challengeStore.openChallenge('array-quiz', [{ type: 'push', value: 7 }])
    challengeStore.closeChallenge(false)
    expect(resumeCalls).toEqual([{ challengeId: 'array-quiz', completedSuccessfully: false }])
  })
})
