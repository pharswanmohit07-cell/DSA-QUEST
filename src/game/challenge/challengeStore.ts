import { useSyncExternalStore } from 'react'
import type {
  ChallengeId,
  ChallengeState,
  ChallengeTarget,
  FeedbackState,
  StackOp,
  QueueOperation,
} from './challengeTypes'
import { QUEUE_SUPPLY_CAPACITY, QUEUE_SUPPLY_STEPS } from './queueChallenge'
import { selectArrayQuizQuestions } from './questionBank'
import type { QuizQuestion, QuizStatus } from './challengeTypes'
import { QuestManager } from '../quests/QuestManager'
import { startAdventureMusic, startKnowledgeTrialMusic } from '../../audio/music'
import { playAchievementJingle, playGameOverJingle } from '../../audio/soundEffects'
import { gradeInteractiveChallenge, gradeStackOperations } from '../quests/masteryGrading'
import { setArraysCampaignStage } from '../quests/arraysCampaignStages'
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
  queueCapacity: QUEUE_SUPPLY_CAPACITY,
  queueStepIndex: 0,
  arrayWorkshopStepIndex: 0,
  arrayWorkshopOperationIndex: 0,
  arrayWorkshopValues: [...ARRAY_WORKSHOP_INITIAL_VALUES],
  arrayWorkshopHintsUsed: 0,
})

let state = initialState()
let sceneBridge: ChallengeSceneBridge | null = null
const ARRAY_QUIZ_HISTORY_KEY = 'dsa-quest-array-quiz-history-v1'
const ARRAY_QUIZ_LAST_FIRST_KEY = 'dsa-quest-array-quiz-last-first-v1'

function readArrayQuizHistory(): string[] {
  if (typeof window === 'undefined') {
    return []
  }
  try {
    const stored = JSON.parse(localStorage.getItem(ARRAY_QUIZ_HISTORY_KEY) ?? '[]')
    return Array.isArray(stored)
      ? stored.filter((id): id is string => typeof id === 'string')
      : []
  } catch {
    return []
  }
}

/** Read-only list of distinct quiz question IDs recorded in history. */
export function getSeenArrayQuizQuestionIds(): readonly string[] {
  return [...new Set(readArrayQuizHistory())]
}

function writeArrayQuizHistory(ids: readonly string[]) {
  if (typeof window === 'undefined') {
    return
  }
  try {
    localStorage.setItem(ARRAY_QUIZ_HISTORY_KEY, JSON.stringify([...new Set(ids)]))
  } catch {
    // The quiz remains random for the current session when storage is unavailable.
  }
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

export const challengeStore = {
  /**
   * Opens the LEARN stage: the Elder's complete array explanation, replayed as
   * the lesson overlay's visual panels (definition, indexing, complexity,
   * insertion and recap). Completing it hands control back to the scene, which
   * advances the prologue to PRACTICE.
   */
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
      let questionHistory = readArrayQuizHistory()
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
      writeArrayQuizHistory([
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
    if (operation.type === 'enqueue') {
      if (currentQueue.length >= state.queueCapacity) {
        setIncorrectOperationFeedback({
          isError: true,
          message: `Queue is full. Enqueue was rejected; dequeue a supply before adding another.`,
        })
        return false
      }
      currentQueue.push(operation.value)
      message = `Enqueued ${operation.value} at the rear. New supplies join the back of the queue.`
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
      message = `Dequeued ${frontValue} from the front. FIFO serves the oldest arrival first.`
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
      state.activeChallenge === 'queue-village-supply'
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
    if (state.activeChallenge !== 'array-knowledge-scroll') return
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
    // Success is challenge-specific and enforced here, not trusted from the
    // caller: the stack practice requires the full operation sequence
    // (isComplete), the trial requires its own 2/3 pass state, and any other
    // challenge can never report success through this path. The trial's pass
    // is recorded by the scene via the side-quest state machine, never through
    // the campaign completion path.
    const succeeded = completedSuccessfully &&
      (challengeId === 'array-lesson'
        ? state.isComplete
        : challengeId === 'array-stack-operations'
          ? state.isComplete
          : challengeId === 'array-quiz'
            ? state.quizStatus === 'passed'
            : challengeId === 'array-knowledge-scroll'
              ? state.isComplete
              : challengeId === 'village-training-trial'
              ? state.quizStatus === 'passed'
              : challengeId === 'queue-village-supply'
                ? state.isComplete &&
                  state.queueStepIndex === QUEUE_SUPPLY_STEPS.length &&
                  state.currentQueue.length === 0
                : challengeId === 'array-manipulation-workshop'
                  ? state.isComplete &&
                    state.arrayWorkshopStepIndex === ARRAY_WORKSHOP_STEPS.length
                  : false)
    if (succeeded && challengeId !== 'array-stack-operations' && challengeId !== 'array-lesson' && challengeId !== 'array-manipulation-workshop') {
      playAchievementJingle()
    }
    if (challengeId === 'array-knowledge-scroll') startAdventureMusic()
    if (challengeId === 'queue-village-supply') {
      QuestManager.completeTopic('queues', {
        passed: succeeded,
        masteryGrade: gradeStackOperations(state.incorrectOperations),
        hintsUsed: 0,
      })
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
