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
  /** Which Elder lesson panel is showing when `activeChallenge === 'array-lesson'`. */
  lessonStage: ElderLessonStage | null
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
  quizAnswerPend¶»§q«^