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
  quizAnswerPending: fal¶»§q«^