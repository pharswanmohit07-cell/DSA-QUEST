export type StackOp = {
  type: 'push' | 'pop'
  value?: number
}

/** Ordered operations the player must perform to complete a challenge. */
export type ChallengeTarget = readonly StackOp[]

export type FeedbackState = {
  isError: boolean
  message: string
}

export type ChallengeId =
  | 'array-lesson'
  | 'array-quiz'
  | 'array-knowledge-scroll'
  | 'array-stack-operations'
  | 'village-training-trial'
  | 'queue-village-supply'
  | 'farmer-queue-lesson'
  | 'farmer-queue-final-quiz'
  | 'farmer-queue-delivery'
  | 'village-guide-arrays'
  | 'array-manipulation-workshop'
  | 'samurai-stack-lesson'
  | 'samurai-stack-quiz'
  | 'samurai-stack-dojo'

/** Stage marker carried on the lesson overlay so React can render the right panel. */
export type ElderLessonStage = 'learn' | 'final-quiz'

export type QueueOperation =
  | { type: 'enqueue'; value: number }
  | { type: 'dequeue' }
  | { type: 'front' }
  | { type: 'rear' }

export type QuizQuestion = {
  id: string
  difficulty: 'easy' | 'medium' | 'hard'
  prompt: string
  options: string[]
  correctAnswerIndex: number
  explanation: string
}

export type QuizStatus = 'idle' | 'in-progress' | 'passed' | 'failed'

export type ChallengeState = {
  activeChallenge: ChallengeId | null
  /** Which Elder lesson panel is showing when `activeChallenge === 'array-lesson'. */
  lessonStage: ElderLessonStage | null
  /** Current page in the Samurai's campaign lesson. */
  stackLessonPageIndex: number
  /** Current page in the Farmer's Queue lesson; page 3 is the hands-on practice. */
  queueLessonPageIndex: number
  /** Guided/practice/final state for the Dojo Scroll Tower. */
  samuraiStackProgress: import('./samuraiStackChallenge').SamuraiStackProgress | null
  currentStack: number[]
  completedOps: StackOp[]
  targetOps: StackOp[]
  isComplete: boolean
  dsaVisionEnabled: boolean
  feedback: FeedbackState | null
  quizQuestions: QuizQuestion[]
  currentQuestionIndex: number
  heartsRemaining: number
  correctAnswers: number
  incorrectOperations: number
  quizStatus: QuizStatus
  quizAnswerPending: boolean
  currentQueue: number[]
  /** Parcels that have left the front of the Farmer's queue, in delivery order. */
  deliveredQueueValues: number[]
  /** Next parcel index in the independent Farmer delivery round. */
  deliveryLoadedCount: number
  queueCapacity: number
  queueStepIndex: number
  /** Current scenario stage and sub-operation in the Village Guide's Workshop. */
  arrayWorkshopStepIndex: number
  arrayWorkshopOperationIndex: number
  arrayWorkshopValues: number[]
  arrayWorkshopHintsUsed: number
}
