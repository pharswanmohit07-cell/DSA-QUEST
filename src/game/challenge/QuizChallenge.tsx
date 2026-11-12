import { useEffect } from 'react'
import { ArrayKnowledgeScrollChallenge } from './ArrayKnowledgeScrollChallenge'
import { VillageGuideArraysLesson } from './VillageGuideArraysLesson'
import { ArrayManipulationWorkshop } from './ArrayManipulationWorkshop'
import { challengeStore, useChallengeState, VILLAGE_TRAINING_TRIAL_PASS_THRESHOLD } from './challengeStore'
import './quizChallenge.css'

export function QuizChallenge() {
  const challenge = useChallengeState()

  useEffect(() => {
    if (challenge.activeChallenge !== 'array-quiz' || challenge.quizStatus !== 'failed') {
      return
    }
    const timeout = window.setTimeout(() => challengeStore.closeChallenge(false), 4000)
    return () => window.clearTimeout(timeout)
  }, [challenge.activeChallenge, challenge.quizStatus])

  if (challenge.activeChallenge === 'village-guide-arrays') return <VillageGuideArraysLesson />
  if (challenge.activeChallenge === 'array-manipulation-workshop') return <ArrayManipulationWorkshop />

  if (challenge.activeChallenge === 'array-knowledge-scroll') {
    return <ArrayKnowledgeScrollChallenge />
  }

  if (challenge.activeChallenge === 'village-training-trial') {
    return <VillageTrainingTrial />
  }

  if (challenge.activeChallenge !== 'array-quiz') {
    return null
  }

  const question = challenge.quizQuestions[challenge.currentQuestionIndex]

  return (
    <div
      className="array-challenge-overlay quiz-challenge-overlay"
      data-testid="quiz-overlay"
      role="dialog"
   ¶»§q«^