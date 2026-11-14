import { useSyncExternalStore } from 'react'
import type {
  ChallengeId,
  ChallengeState,
  ChallengeTarget,
  FeedbackState,
  StackOp,
  QueueOperation,
} from './challengeTypes'
import { getQueueDeliveryParcel, QUEUE_DELIVERY_MANIFEST, QUEUE_SUPPLY_CAPACITY, QUEUE_SUPPLY_STEPS } from './queueChallenge'
import { selectArrayQuizQuestions, selectQueueQuizQuestions, selectStackQuizQuestions } from './questionBank'
import { readTopicQuestionHistory, writeTopicQuestionHistory } from './questionBankHistory'
import {
  applySamuraiStackAction,
  beginSamuraiFinalTrial,
  createSamuraiStackProgress,
  enterSamuraiPractice,
  applySamuraiStackHint,
  type SamuraiStackAction,
} from './samuraiStackChallenge'
import type { QuizQuestion, QuizStatus } from './challengeTypes'
import { QuestManager } from '../quests/QuestManager'
import { startAdventureMusic, startKnowledgeTrialMusic } from '../../audio/music'
import { playAchievementJingle, playGameOverJingle } from '../../audio/soundEffects'
import { gradeInteractiveChallenge, gradeStackOperations } from '../quests/masteryGrading'
import { setArraysCampaignStage } from '../quests/arraysCampaignStages'
import { setNpcCampaignStage } from '../quests/npcCampaignStages'
import { claimKnowledgeScroll, hasKnowledgeScroll } from '../quests/knowledgeScrolls'
import {
  ARRAY_WORKSHOP_INITIAL_VALUES,
  ARRAY_WORKSHOP_STEPS,
  applyArrayManipulationWorkshopOperation,
  type ArrayWorkshopOperation,
} from './arrayManipulationWorkshop'

type Listener = () => void

export type ChallengeSceneBridge = {
  pausePlayer: () => void
  resumePlayer: (challengeId: ChallengeId, completedSuccessfully: boolean) => void
}

const initialState = (): ChallengeState => ({
  activeChallenge: null,
  lessonStage: null,
  stackLessonPageIndex: 0,
  queueLessonPageIndex: 0,
  samuraiStackProgress: null,
  currentStack: [],
  completedOps: [],
  targetOps: [],
  isComplete: false,
  dsaVisionEnabled: false,
  feedback: null,
  quizQuestions: [],
  currentQuestionIndex: 0,
  heartsRemaining: 3,
  correctAnswers: 0,
  incorrectOperations: 0,
  quizStatus: 'idle',
  quizAnswerPending: false,
  currentQueue: [],
  deliveredQueueValues: [],
  deliveryLoadedCount: 0,
  queueCapacity: QUEUE_SUPPLY_CAPACITY,
  queueStepIndex: 0,
  arrayWorkshopStepIndex: 0,
  arrayWorkshopOperationIndex: 0,
  arrayWorkshopValues: [...ARRAY_WORKSHOP_INITIAL_VALUES],
  arrayWorkshopHintsUsed: 0,
})

let state = initialState()
let sceneBridge: ChallengeSceneBridge | null = null
const ARRAY_QUIZ_LAST_FIRST_KEY = 'dsa-quest-array-quiz-last-first-v1'

/** Read-only list of distinct quiz question IDs recorded in legacy Arrays history. */
export function getSeenArrayQuizQuestionIds(): readonly string[] {
  return readTopicQuestionHistory('arrays')
}

function readLastArrayQuizFirstId(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const stored = localStorage.getItem(ARRAY_QUIZ_LAST_FIRST_KEY)
    return stored || null
  } catch {
    return null
  }
}

function writeLastArrayQuizFirstId(id: string) {
  if (typeof window === 'undefined') {
    return
  }
  try {
    localStorage.setItem(ARRAY_QUIZ_LAST_FIRST_KEY, id)
  } catch {
    // The quiz still randomizes for the current session when storage is unavailable.
  }
}

/**
 * Fixed three-question set for the Samurai's Village Training Route trial.
 * Deliberately separate from the Array quiz question bank so the trial never
 * touches the campaign quiz history. Passing requires at least 2/3 correct.
 */
export const VILLAGE_TRAINING_TRIAL_QUESTIONS: readonly QuizQuestion[] = [
  {
    id: 'village-trial-array-index',
    difficulty: 'easy',
    prompt: 'Given the array [4, 7, 9], which index contains the value 7?',
    options: ['0', '1', '2', '3'],
    correctAnswerIndex: 1,
    explanation:
      'Array indices count from zero, so 4 sits at index 0, 7 at index 1, and 9 at index 2. Index 3 is out of bounds for a three-element array.',
  },
  {
    id: 'village-trial-stack-pop',
    difficulty: 'easy',
    prompt: 'A stack receives push(10), push(20), push(30), then pop(). Which value is removed?',
    options: ['10', '20', '30', 'None'],
    correctAnswerIndex: 2,
    explanation:
      'A stack is LIFO — Last In, First Out. The last value pushed was 30, so pop() removes 30 first. 10 was pushed first and leaves last.',
  },
  {
    id: 'village-trial-array-complexity',
    difficulty: 'medium',
    prompt: 'What is the typical time complexity of accessing an array element directly by its index?',
    options: ['O(1)', 'O(n)', 'O(n²)', 'O(log n)'],
    correctAnswerIndex: 0,
    explanation:
      'Direct index access jumps straight to the element in constant time O(1), no matter how large the array is. O(n) applies to searching an unsorted array by value.',
  },
]

/** Minimum correct answers required to pass the Samurai trial (2 of 3). */
export const VILLAGE_TRAINING_TRIAL_PASS_THRESHOLD = 2

let previousQuizQuestionIds: string[] = []
let quizHistoryBeforeAttempt: string[] = []
let previousQueueQuizQuestionIds: string[] = []
let queueQuizHistoryBeforeAttempt: string[] = []
const listeners = new Set<Listener>()

function emit() {
  for (const listener of [...listeners]) {
    listener()
  }
}

function setFeedbackState(feedback: FeedbackState) {
  state = { ...state, feedback }
  emit()
}

function setIncorrectOperationFeedback(feedback: FeedbackState) {
  state = {
    ...state,
    incorrectOperations: state.incorrectOperations + 1,
    feedback,
  }
  emit()
}

function describeOp(op: StackOp): string {
  return op.type === 'push' ? `Push ${op.value ?? '?'}` : 'Pop'
}

function matchesOp(actual: StackOp, expected: StackOp): boolean {
  return actual.type === expected.type &&
    (actual.type !== 'push' || actual.value === expected.value)
}

export function registerChallengeSceneBridge(bridge: ChallengeSceneBridge): () => void {
  sceneBridge = bridge
  return () => {
    if (sceneBridge === bridge) {
      sceneBridge = null
    }
  }
}

export type ArraysWorkshopCompletion = {
  completed: boolean
  firstCompletion: boolean
}

function beginFarmerQueueQuizAttempt() {
  setNpcCampaignStage('queues', 'practice')
  let questionHistory = readTopicQuestionHistory('queues')
  let questions
  try {
    questions = selectQueueQuizQuestions(questionHistory)
  } catch {
    // Start a fresh cycle when too few unused IDs remain for all three tiers.
    questionHistory = []
    questions = selectQueueQuizQuestions([])
  }
  previousQueueQuizQuestionIds = questions.map((question) => question.id)
  queueQuizHistoryBeforeAttempt = [...questionHistory]
  state = {
    ...state,
    activeChallenge: 'farmer-queue-final-quiz',
    quizQuestions: questions.map((question) => ({ ...question, options: [...question.options] })),
    currentQuestionIndex: 0,
    heartsRemaining: 3,
    correctAnswers: 0,
    quizStatus: 'in-progress',
    quizAnswerPending: false,
    feedback: null,
  }
  emit()
}

function beginFarmerQueueDeliveryAttempt() {
  setNpcCampaignStage('queues', 'implement')
  state = {
    ...initialState(),
    activeChallenge: 'farmer-queue-delivery',
  }
  emit()
}

function beginSamuraiStackQuizAttempt() {
  setNpcCampaignStage('stack-operations', 'practice')
  const questionHistory = readTopicQuestionHistory('stack-operations')
  const questions = selectStackQuizQuestions(questionHistory)
  previousQuizQuestionIds = questions.map((question) => question.id)
  quizHistoryBeforeAttempt = [...questionHistory]
  state = {
    ...state,
    activeChallenge: 'samurai-stack-quiz',
    quizQuestions: questions.map((question) => ({ ...question, options: [...question.options] })),
    currentQuestionIndex: 0,
    heartsRemaining: 3,
    correctAnswers: 0,
    quizStatus: 'in-progress',
    quizAnswerPending: false,
    feedback: null,
  }
  emit()
}

export const challengeStore = {
  /** True while any React challenge modal owns the player's input. */
  hasActiveChallenge(): boolean {
    return state.activeChallenge !== null
  },

  /** Starts the Farmer's formal Queue campaign from the existing village NPC. */
  openFarmerQueueLesson(): boolean {
    if (state.activeChallenge || !QuestManager.startTopic('queues')) return false
    setNpcCampaignStage('queues', 'learn')
    state = {
      ...initialState(),
      activeChallenge: 'farmer-queue-lesson',
      queueLessonPageIndex: 0,
    }
    emit()
    sceneBridge?.pausePlayer()
    return true
  },

  /** Advances the Queue lesson; its third page leads into a small hands-on practice. */
  advanceFarmerQueueLesson(): void {
    if (state.activeChallenge !== 'farmer-queue-lesson') return
    if (state.queueLessonPageIndex < 2) {
      state = { ...state, queueLessonPageIndex: state.queueLessonPageIndex + 1 }
      emit()
      return
    }
    setNpcCampaignStage('queues', 'practice')
    state = { ...state, queueLessonPageIndex: 3 }
    emit()
  },

  /** Starts the existing FIFO delivery activity after the guided practice. */
  beginFarmerQueueDelivery(): void {
    if (state.activeChallenge !== 'farmer-queue-lesson' || state.queueLessonPageIndex !== 3) return
    state = {
      ...initialState(),
      activeChallenge: 'queue-village-supply',
    }
    emit()
  },

  /** Loads the next arriving parcel at the rear during the independent delivery round. */
  loadNextFarmerDeliveryParcel(): boolean {
    if (state.activeChallenge !== 'farmer-queue-delivery' || state.isComplete) return false
    const parcel = QUEUE_DELIVERY_MANIFEST[state.deliveryLoadedCount]
    if (!parcel) {
      setFeedbackState({ isError: false, message: 'All five parcels are already in the delivery line.' })
      return false
    }
    if (state.currentQueue.length >= state.queueCapacity) {
      setIncorrectOperationFeedback({
        isError: true,
        message: 'The queue is full (capacity ' + state.queueCapacity + '). This is overflow; dispatch the FRONT parcel before loading another.',
      })
      return false
    }

    state = {
      ...state,
      currentQueue: [...state.currentQueue, parcel.value],
      deliveryLoadedCount: state.deliveryLoadedCount + 1,
      feedback: {
        isError: false,
        message: 'Loaded ' + parcel.cargo + ' for ' + parcel.destination + ' at the REAR. Earlier arrivals remain ahead of it.',
      },
    }
    emit()
    return true
  },

  /** Inspects the first waiting parcel without removing it. */
  inspectFarmerDeliveryFront(): boolean {
    if (state.activeChallenge !== 'farmer-queue-delivery' || state.isComplete) return false
    const value = state.currentQueue[0]
    if (value === undefined) {
      setFeedbackState({ isError: true, message: 'The queue is empty. There is no FRONT parcel to inspect.' })
      return false
    }
    const parcel = getQueueDeliveryParcel(value)
    setFeedbackState({
      isError: false,
      message: parcel
        ? 'FRONT: ' + parcel.cargo + ' for ' + parcel.destination + '. Inspection does not remove it.'
        : 'FRONT: parcel ' + value + '. Inspection does not remove it.',
    })
    return true
  },

  /** Inspects the newest waiting parcel without changing the queue. */
  inspectFarmerDeliveryRear(): boolean {
    if (state.activeChallenge !== 'farmer-queue-delivery' || state.isComplete) return false
    const value = state.currentQueue[state.currentQueue.length - 1]
    if (value === undefined) {
      setFeedbackState({ isError: true, message: 'The queue is empty. There is no REAR parcel to inspect.' })
      return false
    }
    const parcel = getQueueDeliveryParcel(value)
    setFeedbackState({
      isError: false,
      message: parcel
        ? 'REAR: ' + parcel.cargo + ' for ' + parcel.destination + '. Inspection does not remove it.'
        : 'REAR: parcel ' + value + '. Inspection does not remove it.',
    })
    return true
  },

  /** Dispatches only the oldest waiting parcel, preserving FIFO order. */
  dispatchFarmerDeliveryFront(): boolean {
    if (state.activeChallenge !== 'farmer-queue-delivery' || state.isComplete) return false
    const frontValue = state.currentQueue[0]
    if (frontValue === undefined) {
      setIncorrectOperationFeedback({
        isError: true,
        message: 'Cannot dispatch from an empty queue — underflow. No parcel was delivered.',
      })
      return false
    }

    const currentQueue = state.currentQueue.slice(1)
    const deliveredQueueValues = [...state.deliveredQueueValues, frontValue]
    const parcel = getQueueDeliveryParcel(frontValue)
    const isComplete = state.deliveryLoadedCount === QUEUE_DELIVERY_MANIFEST.length &&
      deliveredQueueValues.length === QUEUE_DELIVERY_MANIFEST.length &&
      currentQueue.length === 0
    state = {
      ...state,
      currentQueue,
      deliveredQueueValues,
      isComplete,
      feedback: {
        isError: false,
        message: parcel
          ? 'Dispatched ' + parcel.cargo + ' to ' + parcel.destination + ' from the FRONT. FIFO delivered the oldest arrival first.'
          : 'Dispatched parcel ' + frontValue + ' from the FRONT.',
      },
    }
    emit()
    return true
  },

  answerFarmerQueueQuiz(answerIndex: number): void {
    if (state.activeChallenge !== 'farmer-queue-final-quiz' || state.quizStatus !== 'in-progress') return
    const question = state.quizQuestions[state.currentQuestionIndex]
    if (!question || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= question.options.length) return

    const isCorrect = answerIndex === question.correctAnswerIndex
    const heartsRemaining = isCorrect ? state.heartsRemaining : state.heartsRemaining - 1
    if (heartsRemaining === 0) playGameOverJingle()
    const answer = question.options[question.correctAnswerIndex]
    state = {
      ...state,
      heartsRemaining,
      correctAnswers: state.correctAnswers + Number(isCorrect),
      quizAnswerPending: true,
      feedback: {
        isError: !isCorrect,
        message: isCorrect
          ? `Correct! ${question.explanation}`
          : `Not quite — the correct answer is ${answer}. ${question.explanation}`,
      },
    }
    emit()
  },

  advanceFarmerQueueQuiz(): void {
    if (state.activeChallenge !== 'farmer-queue-final-quiz' || !state.quizAnswerPending) return
    const nextQuestionIndex = state.currentQuestionIndex + 1
    const quizStatus = state.heartsRemaining === 0
      ? 'failed'
      : nextQuestionIndex >= state.quizQuestions.length
        ? 'passed'
        : 'in-progress'
    const terminal = quizStatus === 'passed' || quizStatus === 'failed'
    if (terminal) {
      writeTopicQuestionHistory('queues', [
        ...queueQuizHistoryBeforeAttempt,
        ...previousQueueQuizQuestionIds,
      ])
    }
    state = {
      ...state,
      currentQuestionIndex: quizStatus === 'in-progress' ? nextQuestionIndex : state.currentQuestionIndex,
      quizStatus,
      quizAnswerPending: false,
    }
    emit()
  },

  retryFarmerQueueQuiz(): void {
    if (state.activeChallenge !== 'farmer-queue-final-quiz' || state.quizStatus !== 'failed') return
    beginFarmerQueueQuizAttempt()
  },
  /** Begins the Samurai's formal Stack Operations campaign topic. */
  openSamuraiStackLesson(): boolean {
    if (state.activeChallenge || !QuestManager.startTopic('stack-operations')) return false
    setNpcCampaignStage('stack-operations', 'learn')
    state = {
      ...initialState(),
      activeChallenge: 'samurai-stack-lesson',
      stackLessonPageIndex: 0,
    }
    emit()
    sceneBridge?.pausePlayer()
    return true
  },

  /** Advances the lesson, then enters a topic-scoped three-question quiz. */
  advanceSamuraiStackLesson(): void {
    if (state.activeChallenge !== 'samurai-stack-lesson') return
    if (state.stackLessonPageIndex < 2) {
      state = { ...state, stackLessonPageIndex: state.stackLessonPageIndex + 1 }
      emit()
      return
    }
    beginSamuraiStackQuizAttempt()
  },

  answerSamuraiStackQuiz(answerIndex: number): void {
    if (state.activeChallenge !== 'samurai-stack-quiz' || state.quizStatus !== 'in-progress') return
    const question = state.quizQuestions[state.currentQuestionIndex]
    if (!question || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= question.options.length) return

    const isCorrect = answerIndex === question.correctAnswerIndex
    const heartsRemaining = isCorrect ? state.heartsRemaining : state.heartsRemaining - 1
    if (heartsRemaining === 0) playGameOverJingle()
    const answer = question.options[question.correctAnswerIndex]
    state = {
      ...state,
      heartsRemaining,
      correctAnswers: state.correctAnswers + Number(isCorrect),
      quizAnswerPending: true,
      feedback: {
        isError: !isCorrect,
        message: isCorrect
          ? `Correct! ${question.explanation}`
          : `Not quite — the correct answer is ${answer}. ${question.explanation}`,
      },
    }
    emit()
  },

  advanceSamuraiStackQuiz(): void {
    if (state.activeChallenge !== 'samurai-stack-quiz' || !state.quizAnswerPending) return
    const nextQuestionIndex = state.currentQuestionIndex + 1
    const quizStatus = state.heartsRemaining === 0
      ? 'failed'
      : nextQuestionIndex >= state.quizQuestions.length
        ? 'passed'
        : 'in-progress'
    const terminal = quizStatus === 'passed' || quizStatus === 'failed'
    if (terminal) {
      writeTopicQuestionHistory('stack-operations', [
        ...quizHistoryBeforeAttempt,
        ...previousQuizQuestionIds,
      ])
    }
    if (quizStatus === 'passed') setNpcCampaignStage('stack-operations', 'implement')
    state = {
      ...state,
      activeChallenge: quizStatus === 'passed' ? 'samurai-stack-dojo' : 'samurai-stack-quiz',
      currentQuestionIndex: quizStatus === 'in-progress' ? nextQuestionIndex : state.currentQuestionIndex,
      quizStatus,
      quizAnswerPending: false,
      samuraiStackProgress: quizStatus === 'passed' ? createSamuraiStackProgress() : state.samuraiStackProgress,
    }
    emit()
  },

  retrySamuraiStackQuiz(): void {
    if (state.activeChallenge !== 'samurai-stack-quiz' || state.quizStatus !== 'failed') return
    beginSamuraiStackQuizAttempt()
  },

  executeSamuraiStackAction(action: SamuraiStackAction): void {
    if (state.activeChallenge !== 'samurai-stack-dojo' || !state.samuraiStackProgress) return
    state = { ...state, samuraiStackProgress: applySamuraiStackAction(state.samuraiStackProgress, action) }
    emit()
  },

  enterSamuraiStackPractice(): void {
    if (state.activeChallenge !== 'samurai-stack-dojo' || !state.samuraiStackProgress) return
    state = { ...state, samuraiStackProgress: enterSamuraiPractice(state.samuraiStackProgress) }
    emit()
  },

  beginSamuraiStackFinalTrial(): void {
    if (state.activeChallenge !== 'samurai-stack-dojo' || !state.samuraiStackProgress) return
    state = { ...state, samuraiStackProgress: beginSamuraiFinalTrial(state.samuraiStackProgress) }
    emit()
  },

  applySamuraiStackHint(): void {
    if (state.activeChallenge !== 'samurai-stack-dojo' || !state.samuraiStackProgress) return
    state = { ...state, samuraiStackProgress: applySamuraiStackHint(state.samuraiStackProgress) }
    emit()
  },

  openArrayLesson(): void {
    if (state.activeChallenge) {
      return
    }
    state = {
      ...initialState(),
      activeChallenge: 'array-lesson',
      lessonStage: 'learn',
    }
    emit()
    sceneBridge?.pausePlayer()
  },

  /** Finishes the LEARN stage; the scene advances the prologue on close. */
  completeArrayLesson(): void {
    if (state.activeChallenge !== 'array-lesson' || state.lessonStage !== 'learn' || state.isComplete) {
      return
    }
    state = { ...state, isComplete: true }
    playAchievementJingle()
    emit()
  },

  /**
   * Moves directly from the Village Guide's passed practice quiz into the
   * Array Workshop without briefly resuming player movement or the scene.
   */
  transitionToArrayWorkshop(): void {
    if (state.activeChallenge !== 'village-guide-arrays') {
      return
    }

    state = {
      ...initialState(),
      activeChallenge: 'array-manipulation-workshop',
    }
    emit()
  },

  openChallenge(challengeId: ChallengeId, targetOps: ChallengeTarget = []): void {
    if (state.activeChallenge) {
      return
    }
    const scrollTopic = challengeId === 'stack-knowledge-scroll'
      ? 'stack-operations'
      : challengeId === 'queue-knowledge-scroll'
        ? 'queues'
        : null
    if (scrollTopic && (
      QuestManager.getCampaign().topics[scrollTopic].status !== 'completed' ||
      hasKnowledgeScroll(scrollTopic)
    )) {
      return
    }
    // The Elder's Array quiz and Stack practice are the legacy gate prologue,
    // not the Village Guide's Arrays or Samurai's Stack campaign topics. The
    // Farmer's queue challenge remains a formal campaign topic.
    const topicId = challengeId === 'queue-village-supply' ? 'queues' : null
    if (topicId && !QuestManager.startTopic(topicId)) return

    state = {
      ...initialState(),
      activeChallenge: challengeId,
      targetOps: targetOps.map((op) => ({ ...op })),
      quizQuestions: [],
      quizStatus: challengeId === 'array-quiz' ? 'in-progress' : 'idle',
    }

    if (challengeId === 'array-quiz') {
      let questionHistory = readTopicQuestionHistory('arrays')
      const lastFirstQuestionId = readLastArrayQuizFirstId()
      const excludedQuestionIds = lastFirstQuestionId
        ? [...new Set([...questionHistory, lastFirstQuestionId])]
        : questionHistory
      let quizQuestions
      try {
        quizQuestions = selectArrayQuizQuestions(excludedQuestionIds)
      } catch {
        // Start a fresh question cycle when the remaining unused questions
        // cannot form the required Easy + Medium + Hard quiz.
        questionHistory = []
        quizQuestions = selectArrayQuizQuestions(
          lastFirstQuestionId ? [lastFirstQuestionId] : [],
        )
      }

      state.quizQuestions = quizQuestions.map((question) => ({
        ...question,
        options: [...question.options],
      }))
      previousQuizQuestionIds = state.quizQuestions.map((question) => question.id)
      // Keep this attempt's effective history in memory. Abandoning the quiz
      // must not consume question IDs or reset a completed question cycle.
      quizHistoryBeforeAttempt = [...questionHistory]
    }
    if (challengeId === 'village-training-trial') {
      state.quizQuestions = VILLAGE_TRAINING_TRIAL_QUESTIONS.map((question) => ({
        ...question,
        options: [...question.options],
      }))
      state.quizStatus = 'in-progress'
      // The trial is independent of the Array quiz: no hearts and no history
      // write. correctAnswers counts toward the fixed 2/3 pass threshold.
    }
    emit()
    if (challengeId === 'array-knowledge-scroll') startKnowledgeTrialMusic()
    sceneBridge?.pausePlayer()
  },

  answerTrialQuestion(answerIndex: number): void {
    if (state.activeChallenge !== 'village-training-trial' || state.quizStatus !== 'in-progress') {
      return
    }
    const question = state.quizQuestions[state.currentQuestionIndex]
    if (!question || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= question.options.length) {
      return
    }

    const isCorrect = answerIndex === question.correctAnswerIndex
    const answer = question.options[question.correctAnswerIndex]
    state = {
      ...state,
      correctAnswers: state.correctAnswers + Number(isCorrect),
      quizAnswerPending: true,
      feedback: {
        isError: !isCorrect,
        message: isCorrect
          ? `Correct! ${question.explanation}`
          : `Not quite — the correct answer is ${answer}. ${question.explanation}`,
      },
    }
    emit()
  },

  advanceTrialQuestion(): void {
    if (state.activeChallenge !== 'village-training-trial' || !state.quizAnswerPending) {
      return
    }
    const nextQuestionIndex = state.currentQuestionIndex + 1
    const isLastQuestion = nextQuestionIndex >= state.quizQuestions.length
    const passed = state.correctAnswers >= VILLAGE_TRAINING_TRIAL_PASS_THRESHOLD
    const quizStatus: QuizStatus = isLastQuestion ? (passed ? 'passed' : 'failed') : 'in-progress'
    state = {
      ...state,
      currentQuestionIndex: isLastQuestion ? state.currentQuestionIndex : nextQuestionIndex,
      quizStatus,
      quizAnswerPending: false,
    }
    emit()
    // No QuestManager topic completion here: the trial result is recorded by
    // the scene only after the store closes, keeping campaign state untouched.
  },

  answerQuiz(answerIndex: number): void {
    if (state.activeChallenge !== 'array-quiz' || state.quizStatus !== 'in-progress') {
      return
    }
    const question = state.quizQuestions[state.currentQuestionIndex]
    if (!question || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= question.options.length) {
      return
    }

    const isCorrect = answerIndex === question.correctAnswerIndex
    const heartsRemaining = isCorrect ? state.heartsRemaining : state.heartsRemaining - 1
    if (heartsRemaining === 0) playGameOverJingle()
    const answer = question.options[question.correctAnswerIndex]
    state = {
      ...state,
      heartsRemaining,
      correctAnswers: state.correctAnswers + Number(isCorrect),
      quizAnswerPending: true,
      feedback: {
        isError: !isCorrect,
        message: isCorrect
          ? `Correct! ${question.explanation}`
          : `Not quite — the correct answer is ${answer}. ${question.explanation}`,
      },
    }
    emit()
  },

  advanceQuiz(): void {
    if (state.activeChallenge !== 'array-quiz' || !state.quizAnswerPending) {
      return
    }
    const nextQuestionIndex = state.currentQuestionIndex + 1
    const quizStatus = state.heartsRemaining === 0
      ? 'failed'
      : nextQuestionIndex >= state.quizQuestions.length
        ? 'passed'
        : 'in-progress'
    state = {
      ...state,
      currentQuestionIndex: quizStatus === 'in-progress' ? nextQuestionIndex : state.currentQuestionIndex,
      quizStatus,
      quizAnswerPending: false,
    }
    emit()
    if (quizStatus === 'passed' || quizStatus === 'failed') {
      // A completed pass or fail consumes these questions; an interrupted
      // attempt does not. Persist a fresh-cycle reset only at this point too.
      writeTopicQuestionHistory('arrays', [
        ...quizHistoryBeforeAttempt,
        ...previousQuizQuestionIds,
      ])
      if (previousQuizQuestionIds[0]) {
        writeLastArrayQuizFirstId(previousQuizQuestionIds[0])
      }
    }
  },

  executeOp(op: StackOp): boolean {
    if (!state.activeChallenge || state.isComplete) {
      return false
    }
    if (op.type === 'push' && (op.value === undefined || !Number.isFinite(op.value))) {
      setIncorrectOperationFeedback({ isError: true, message: 'Enter a valid number before pushing it onto the stack.' })
      return false
    }
    if (op.type === 'pop' && state.currentStack.length === 0) {
      setIncorrectOperationFeedback({
        isError: true,
        message: 'You attempted to pop from an empty stack — stack underflow error. Push a value first.',
      })
      return false
    }

    const expected = state.targetOps[state.completedOps.length]
    if (!expected) {
      setIncorrectOperationFeedback({
        isError: true,
        message: 'There are no more operations to perform. Continue the quest to finish.',
      })
      return false
    }
    if (!matchesOp(op, expected)) {
      setIncorrectOperationFeedback({
        isError: true,
        message: `Not quite. The next target operation is ${describeOp(expected)}. Try that operation next.`,
      })
      return false
    }

    const currentStack = [...state.currentStack]
    if (op.type === 'push') {
      if (op.value === undefined || !Number.isFinite(op.value)) {
        setFeedbackState({ isError: true, message: 'Enter a valid number before pushing it onto the stack.' })
        return false
      }
      currentStack.push(op.value)
    } else {
      currentStack.pop()
    }
    const completedOps = [...state.completedOps, { ...op }]
    const isComplete = completedOps.length === state.targetOps.length
    const operationName = op.type === 'push' ? 'Push' : 'Pop'
    state = {
      ...state,
      currentStack,
      completedOps,
      isComplete,
      feedback: {
        isError: false,
        message: isComplete
          ? `${operationName} completed in O(1). Target reached — challenge complete!`
          : `${operationName} Time Complexity: O(1). One stack operation, one step.`,
      },
    }
    emit()
    return true
  },

  executeQueueOp(operation: QueueOperation): boolean {
    if (state.activeChallenge !== 'queue-village-supply' || state.isComplete) {
      return false
    }

    const step = QUEUE_SUPPLY_STEPS[state.queueStepIndex]
    if (!step) {
      setIncorrectOperationFeedback({
        isError: true,
        message: 'The supply sequence has no remaining steps.',
      })
      return false
    }

    if (operation.type === 'enqueue' && !Number.isFinite(operation.value)) {
      setIncorrectOperationFeedback({
        isError: true,
        message: 'Enter a valid supply number before enqueueing it.',
      })
      return false
    }

    const currentQueue = [...state.currentQueue]
    if (operation.type === 'dequeue' && currentQueue.length === 0) {
      setIncorrectOperationFeedback({
        isError: true,
        message: 'Cannot dequeue from an empty queue — underflow. No supply was removed.',
      })
      return false
    }
    if ((operation.type === 'front' || operation.type === 'rear') && currentQueue.length === 0) {
      setIncorrectOperationFeedback({
        isError: true,
        message: 'The queue is empty, so there is no front or rear supply to inspect.',
      })
      return false
    }

    const matchesExpectedOperation = operation.type === step.operation.type &&
      (operation.type !== 'enqueue' ||
        step.operation.type === 'enqueue' && operation.value === step.operation.value)
    if (!matchesExpectedOperation) {
      setIncorrectOperationFeedback({
        isError: true,
        message: `Not quite. Next step: ${step.label}. The queue was not changed.`,
      })
      return false
    }

    if (step.expectedOverflow) {
      if (operation.type !== 'enqueue' || currentQueue.length !== state.queueCapacity) {
        setIncorrectOperationFeedback({
          isError: true,
          message: `The overflow check needs a full queue of ${state.queueCapacity} supplies first.`,
        })
        return false
      }

      const queueStepIndex = state.queueStepIndex + 1
      const isComplete = queueStepIndex >= QUEUE_SUPPLY_STEPS.length
      state = {
        ...state,
        queueStepIndex,
        isComplete,
        feedback: {
          isError: false,
          message: `Queue is full (capacity ${state.queueCapacity}). Supply ${operation.value} was rejected and the queue stayed unchanged. This is overflow.`,
        },
      }
      emit()
      return true
    }

    let message = ''
    let deliveredQueueValues = state.deliveredQueueValues
    if (operation.type === 'enqueue') {
      if (currentQueue.length >= state.queueCapacity) {
        setIncorrectOperationFeedback({
          isError: true,
          message: `Queue is full. Enqueue was rejected; dequeue a supply before adding another.`,
        })
        return false
      }
      currentQueue.push(operation.value)
      message = 'Enqueued ' + operation.value + ' at the rear. New supplies join the back of the queue.'
    } else if (operation.type === 'dequeue') {
      const frontValue = currentQueue[0]
      if (step.expectedValue !== undefined && frontValue !== step.expectedValue) {
        setIncorrectOperationFeedback({
          isError: true,
          message: `FIFO check failed: the front is ${frontValue}, not ${step.expectedValue}. Nothing was removed.`,
        })
        return false
      }
      currentQueue.shift()
      deliveredQueueValues = [...state.deliveredQueueValues, frontValue]
      message = 'Dequeued ' + frontValue + ' from the front. FIFO serves the oldest arrival first.'
    } else if (operation.type === 'front') {
      const frontValue = currentQueue[0]
      if (step.expectedValue !== undefined && frontValue !== step.expectedValue) {
        setIncorrectOperationFeedback({
          isError: true,
          message: `Front check expected ${step.expectedValue}, but the current front is ${frontValue}.`,
        })
        return false
      }
      message = `Front is ${frontValue}. Inspecting the front does not remove the supply.`
    } else {
      const rearValue = currentQueue[currentQueue.length - 1]
      if (step.expectedValue !== undefined && rearValue !== step.expectedValue) {
        setIncorrectOperationFeedback({
          isError: true,
          message: `Rear check expected ${step.expectedValue}, but the current rear is ${rearValue}.`,
        })
        return false
      }
      message = `Rear is ${rearValue}. The newest supply waits at the back of the queue.`
    }

    const queueStepIndex = state.queueStepIndex + 1
    const isComplete = queueStepIndex >= QUEUE_SUPPLY_STEPS.length
    state = {
      ...state,
      currentQueue,
      deliveredQueueValues,
      queueStepIndex,
      isComplete,
      feedback: {
        isError: false,
        message: isComplete
          ? `${message} The supply line is restored — every parcel was served in FIFO order.`
          : message,
      },
    }
    emit()
    return true
  },

  setFeedback(message: string): void {
    if (
      state.activeChallenge === 'array-stack-operations' ||
      state.activeChallenge === 'queue-village-supply' ||
      state.activeChallenge === 'farmer-queue-delivery'
    ) {
      setIncorrectOperationFeedback({ isError: true, message })
      return
    }
    setFeedbackState({ isError: true, message })
  },

  toggleDsaVision(): void {
    state = { ...state, dsaVisionEnabled: !state.dsaVisionEnabled }
    emit()
  },

  /** Allows the optional Scroll trial to report success only after all rounds pass. */
  markKnowledgeScrollTrialComplete(): void {
    if (
      state.activeChallenge !== 'array-knowledge-scroll' &&
      state.activeChallenge !== 'stack-knowledge-scroll' &&
      state.activeChallenge !== 'queue-knowledge-scroll'
    ) return
    state = { ...state, isComplete: true }
    emit()
  },

  executeArrayWorkshopOperation(operation: ArrayWorkshopOperation): boolean {
    if (state.activeChallenge !== 'array-manipulation-workshop' || state.isComplete) return false
    const result = applyArrayManipulationWorkshopOperation(
      state.arrayWorkshopValues,
      state.arrayWorkshopStepIndex,
      state.arrayWorkshopOperationIndex,
      operation,
    )
    if (!result.ok) {
      state = {
        ...state,
        incorrectOperations: state.incorrectOperations + 1,
        feedback: { isError: true, message: result.message },
      }
      emit()
      return false
    }

    const nextStepIndex = result.stageComplete
      ? state.arrayWorkshopStepIndex + 1
      : state.arrayWorkshopStepIndex
    state = {
      ...state,
      arrayWorkshopValues: result.values,
      arrayWorkshopStepIndex: nextStepIndex,
      arrayWorkshopOperationIndex: result.stageComplete
        ? 0
        : state.arrayWorkshopOperationIndex + 1,
      isComplete: result.workshopComplete,
      feedback: { isError: false, message: result.message },
    }
    emit()
    return true
  },

  clearArrayWorkshopFeedback(): void {
    if (
      state.activeChallenge !== 'array-manipulation-workshop' ||
      state.feedback === null
    ) return
    state = { ...state, feedback: null }
    emit()
  },

  recordArrayWorkshopInvalidAction(message: string): void {
    if (state.activeChallenge !== 'array-manipulation-workshop' || state.isComplete) return
    state = {
      ...state,
      incorrectOperations: state.incorrectOperations + 1,
      feedback: { isError: true, message },
    }
    emit()
  },

  recordArrayWorkshopHint(): void {
    if (state.activeChallenge !== 'array-manipulation-workshop' || state.isComplete) return
    state = { ...state, arrayWorkshopHintsUsed: state.arrayWorkshopHintsUsed + 1 }
    emit()
  },

  completeArraysWorkshop(): ArraysWorkshopCompletion {
    if (
      state.activeChallenge !== 'array-manipulation-workshop' ||
      !state.isComplete ||
      state.arrayWorkshopStepIndex !== ARRAY_WORKSHOP_STEPS.length
    ) {
      return { completed: false, firstCompletion: false }
    }
    const alreadyClaimed = QuestManager.getCampaign().firstCompletionRewardClaims.includes('arrays')
    const completed = QuestManager.completeTopic('arrays', {
      passed: true,
      masteryGrade: gradeInteractiveChallenge({
        invalidActions: state.incorrectOperations,
        hintsUsed: state.arrayWorkshopHintsUsed,
      }),
      hintsUsed: state.arrayWorkshopHintsUsed,
    })
    if (completed) {
      setArraysCampaignStage('complete')
      playAchievementJingle()
    }
    return { completed, firstCompletion: completed && !alreadyClaimed }
  },

  closeChallenge(completedSuccessfully: boolean): void {
    if (!state.activeChallenge) {
      return
    }
    const challengeId = state.activeChallenge
    if (
      challengeId === 'queue-village-supply' &&
      completedSuccessfully &&
      state.isComplete &&
      state.queueStepIndex === QUEUE_SUPPLY_STEPS.length &&
      state.currentQueue.length === 0
    ) {
      beginFarmerQueueQuizAttempt()
      return
    }
    if (
      challengeId === 'farmer-queue-final-quiz' &&
      completedSuccessfully &&
      state.quizStatus === 'passed'
    ) {
      // Passing the quiz unlocks the independent delivery objective; it is not mastery.
      beginFarmerQueueDeliveryAttempt()
      return
    }
    // Success is challenge-specific and enforced here, not trusted from the
    // caller: the stack practice requires the full operation sequence
    // (isComplete), the trial requires its own 2/3 pass state, and any other
    // challenge can never report success through this path. The trial's pass
    // is recorded by the scene via the side-quest state machine, never through
    // the campaign completion path.
    let succeeded = completedSuccessfully &&
      (challengeId === 'array-lesson'
        ? state.isComplete
        : challengeId === 'array-stack-operations'
          ? state.isComplete
          : challengeId === 'array-quiz'
            ? state.quizStatus === 'passed'
            : challengeId === 'array-knowledge-scroll' ||
                challengeId === 'stack-knowledge-scroll' ||
                challengeId === 'queue-knowledge-scroll'
              ? state.isComplete
              : challengeId === 'village-training-trial'
              ? state.quizStatus === 'passed'
              : challengeId === 'farmer-queue-delivery'
                ? state.isComplete &&
                  state.deliveryLoadedCount === QUEUE_DELIVERY_MANIFEST.length &&
                  state.deliveredQueueValues.length === QUEUE_DELIVERY_MANIFEST.length &&
                  state.currentQueue.length === 0
                : challengeId === 'array-manipulation-workshop'
                  ? state.isComplete &&
                    state.arrayWorkshopStepIndex === ARRAY_WORKSHOP_STEPS.length
                  : challengeId === 'samurai-stack-dojo'
                    ? state.samuraiStackProgress?.mode === 'final' && state.samuraiStackProgress.completed
                    : false)
    if (succeeded && challengeId === 'stack-knowledge-scroll') {
      succeeded = claimKnowledgeScroll('stack-operations')
    } else if (succeeded && challengeId === 'queue-knowledge-scroll') {
      succeeded = claimKnowledgeScroll('queues')
    }
    if (succeeded && challengeId === 'samurai-stack-dojo' && state.samuraiStackProgress) {
      const recorded = QuestManager.completeTopic('stack-operations', {
        passed: true,
        masteryGrade: gradeInteractiveChallenge({
          invalidActions: state.samuraiStackProgress.invalidActions,
          hintsUsed: state.samuraiStackProgress.hintsUsed,
        }),
        hintsUsed: state.samuraiStackProgress.hintsUsed,
      })
      succeeded = recorded
      if (recorded) {
        setNpcCampaignStage('stack-operations', 'complete')
        playAchievementJingle()
      }
    } else if (
      succeeded &&
      challengeId !== 'array-stack-operations' &&
      challengeId !== 'array-lesson' &&
      challengeId !== 'array-manipulation-workshop' &&
      challengeId !== 'farmer-queue-final-quiz'
    ) {
      playAchievementJingle()
    }
    if (challengeId === 'array-knowledge-scroll') startAdventureMusic()
    if (
      challengeId === 'farmer-queue-lesson' ||
      challengeId === 'queue-village-supply' ||
      challengeId === 'farmer-queue-final-quiz' ||
      challengeId === 'farmer-queue-delivery'
    ) {
      const masteryGrade = challengeId === 'farmer-queue-delivery'
        ? gradeInteractiveChallenge({ invalidActions: state.incorrectOperations, hintsUsed: 0 })
        : gradeStackOperations(state.incorrectOperations)
      const recorded = QuestManager.completeTopic('queues', {
        passed: succeeded,
        masteryGrade,
        hintsUsed: 0,
      })
      if (challengeId === 'farmer-queue-delivery') {
        succeeded = succeeded && recorded
        if (succeeded) {
          setNpcCampaignStage('queues', 'complete')
          playAchievementJingle()
        } else if (recorded) {
          setNpcCampaignStage('queues', 'learn')
        }
      } else if (recorded) {
        // A cancelled or failed Queue learning/practice attempt can be restarted
        // from Learn; a quiz pass instead transitions directly to Implement above.
        setNpcCampaignStage('queues', 'learn')
      }
    }
    state = initialState()
    emit()
    sceneBridge?.resumePlayer(challengeId, succeeded)
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  getSnapshot(): ChallengeState {
    return state
  },
}

export function useChallengeState(): ChallengeState {
  return useSyncExternalStore(
    challengeStore.subscribe,
    challengeStore.getSnapshot,
    challengeStore.getSnapshot,
  )
}
