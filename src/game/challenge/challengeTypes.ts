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

export type ChallengeId = 'array-quiz' | 'array-stack-operations' | 'village-training-trial' | 'queue-village-supply'

export type QueueOperation =
  | { type: 'enqueue'; value: number }
  | { type: 'dequeue' }
  | { type: 'front' }
  | { type: 'rear' }

export type QuizQuestion = {
  id: string
  difficulty: 'easy' | 'medium'
  prompt: string
  options: string[]
  correctAnswerIndex: number
  explanation: string
}

export type QuizStatus = 'idle' | 'in-progress' | 'passed' | 'failed'

export type ChallengeState = {
  activeChallenge: ChallengeId | null
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
  queueCapacity: number
  queueStepIndex: number
}
