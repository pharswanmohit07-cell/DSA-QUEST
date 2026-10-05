import { useSyncExternalStore } from 'react'
import type {
  ChallengeId,
  ChallengeState,
  ChallengeTarget,
  FeedbackState,
  StackOp,
} from './challengeTypes'
import { selectArrayQuizQuestions } from './questionBank'

type Listener = () => void

export type ChallengeSceneBridge = {
  pausePlayer: () => void
  resumePlayer: (completedSuccessfully: boolean) => void
}

const initialState = (): ChallengeState => ({
  activeChallenge: null,
  currentStack: [],
  completedOps: [],
  targetOps: [],
  isComplete: false,
  dsaVisionEnabled: false,
  feedback: null,
  quizQuestions: [],
  currentQuestionIndex: 0,
  heartsRemaining: 3,
  quizStatus: 'idle',
  quizAnswerPending: false,
})

let state = initialState()
let sceneBridge: ChallengeSceneBridge | null = null
const ARRAY_QUIZ_HISTORY_KEY = 'dsa-quest-array-quiz-history-v1'

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

let previousQuizQuestionIds: string[] = []
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

export const challengeStore = {
  openChallenge(challengeId: ChallengeId, targetOps: ChallengeTarget): void {
    if (state.activeChallenge) {
      return
    }
    state = {
      ...initialState(),
      activeChallenge: challengeId,
      targetOps: targetOps.map((op) => ({ ...op })),
      quizQuestions: [],
      quizStatus: challengeId === 'array-quiz' ? 'in-progress' : 'idle',
    }

    if (challengeId === 'array-quiz') {
      let questionHistory = readArrayQuizHistory()
      let quizQuestions
      try {
        quizQuestions = selectArrayQuizQuestions(questionHistory)
      } catch {
        // Start a fresh question cycle when the remaining unused questions
        // cannot form the required 2-easy + 1-medium quiz.
        questionHistory = []
        quizQuestions = selectArrayQuizQuestions([])
      }

      state.quizQuestions = quizQuestions.map((question) => ({
        ...question,
        options: [...question.options],
      }))
      previousQuizQuestionIds = state.quizQuestions.map((question) => question.id)
      writeArrayQuizHistory([
        ...questionHistory,
        ...previousQuizQuestionIds,
      ])
    }
    emit()
    sceneBridge?.pausePlayer()
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
    const answer = question.options[question.correctAnswerIndex]
    state = {
      ...state,
      heartsRemaining,
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
  },

  beginStackPractice(): void {
    if (state.activeChallenge !== 'array-quiz' || state.quizStatus !== 'passed') {
      return
    }
    state = {
      ...state,
      activeChallenge: 'array-stack-operations',
      currentStack: [],
      completedOps: [],
      isComplete: false,
      dsaVisionEnabled: false,
      feedback: null,
      quizStatus: 'idle',
    }
    emit()
  },

  executeOp(op: StackOp): boolean {
    if (!state.activeChallenge || state.isComplete) {
      return false
    }
    if (op.type === 'push' && (op.value === undefined || !Number.isFinite(op.value))) {
      setFeedbackState({ isError: true, message: 'Enter a valid number before pushing it onto the stack.' })
      return false
    }
    if (op.type === 'pop' && state.currentStack.length === 0) {
      setFeedbackState({
        isError: true,
        message: 'You attempted to pop from an empty stack — stack underflow error. Push a value first.',
      })
      return false
    }

    const expected = state.targetOps[state.completedOps.length]
    if (!expected) {
      setFeedbackState({
        isError: true,
        message: 'There are no more operations to perform. Continue the quest to finish.',
      })
      return false
    }
    if (!matchesOp(op, expected)) {
      setFeedbackState({
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

  setFeedback(message: string): void {
    setFeedbackState({ isError: true, message })
  },

  toggleDsaVision(): void {
    state = { ...state, dsaVisionEnabled: !state.dsaVisionEnabled }
    emit()
  },

  closeChallenge(completedSuccessfully: boolean): void {
    if (!state.activeChallenge) {
      return
    }
    const succeeded = completedSuccessfully &&
      state.activeChallenge === 'array-stack-operations' &&
      state.isComplete
    state = initialState()
    emit()
    sceneBridge?.resumePlayer(succeeded)
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
