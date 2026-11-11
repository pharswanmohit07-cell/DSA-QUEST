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
import { gradeStackOperations } from '../quests/masteryGrading'

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
    const stored = JSON.parse¶»§q«^