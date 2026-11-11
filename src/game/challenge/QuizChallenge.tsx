import { useEffect } from 'react'
import { ArrayKnowledgeScrollChallenge } from './ArrayKnowledgeScrollChallenge'
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
      aria-modal="true"
      aria-label="Old Man array practice"
    >
      <section className="array-challenge-panel quiz-challenge-panel">
        <header className="array-challenge-header array-practice-header">
          <div>
            <p className="array-challenge-eyebrow">Old Man's Array Practice</p>
            <h2>Array Practice</h¶»§q«^