import { useEffect } from 'react'
import { ArrayKnowledgeScrollChallenge } from './ArrayKnowledgeScrollChallenge'
import { VillageGuideArraysLesson } from './VillageGuideArraysLesson'
import { SamuraiStackLesson } from './SamuraiStackLesson'
import { SamuraiStackQuiz } from './SamuraiStackQuiz'
import { SamuraiStackDojoChallenge } from './SamuraiStackDojoChallenge'
import { FarmerQueueLesson } from './FarmerQueueLesson'
import { FarmerQueueQuiz } from './FarmerQueueQuiz'
import { FarmerQueueDeliveryChallenge } from './FarmerQueueDeliveryChallenge'
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

  if (challenge.activeChallenge === 'samurai-stack-lesson') return <SamuraiStackLesson />
  if (challenge.activeChallenge === 'samurai-stack-quiz') return <SamuraiStackQuiz />
  if (challenge.activeChallenge === 'samurai-stack-dojo') return <SamuraiStackDojoChallenge />
  if (challenge.activeChallenge === 'farmer-queue-lesson') return <FarmerQueueLesson />
  if (challenge.activeChallenge === 'farmer-queue-final-quiz') return <FarmerQueueQuiz />
  if (challenge.activeChallenge === 'farmer-queue-delivery') return <FarmerQueueDeliveryChallenge />
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
      aria-modal="true"
      aria-label="Old Man array practice"
    >
      <section className="array-challenge-panel quiz-challenge-panel">
        <header className="array-challenge-header array-practice-header">
          <div>
            <p className="array-challenge-eyebrow">Old Man's Array Practice</p>
            <h2>Array Practice</h2>
          </div>
          <div className="quiz-challenge-header-actions">
            <div className="quiz-challenge-hearts" role="img" aria-label={`${challenge.heartsRemaining} of 3 hearts remaining`}>
              {[0, 1, 2].map((heart) => (
                <span
                  key={heart}
                  className={heart < challenge.heartsRemaining ? 'is-full' : ''}
                  aria-hidden="true"
                >
                  {heart < challenge.heartsRemaining ? '♥' : '♡'}
                </span>
              ))}
            </div>
            <button
              type="button"
              className="array-challenge-close"
              data-testid="practice-close"
              onClick={() => challengeStore.closeChallenge(false)}
              aria-label="Leave Array Practice"
            />
          </div>
        </header>

        {challenge.quizStatus === 'failed' ? (
          <section className="quiz-challenge-result is-failed" data-testid="quiz-failed">
            <h3>Practice not finished</h3>
            <p>The gate puzzle is still waiting. Return to the Old Man whenever you are ready to try the practice questions again.</p>
            <button type="button" onClick={() => challengeStore.closeChallenge(false)}>
              Return to the Old Man
            </button>
          </section>
        ) : challenge.quizStatus === 'passed' ? (
          <section className="quiz-challenge-result is-passed" data-testid="quiz-passed">
            <h3>Array practice complete</h3>
            <p>You answered all three practice questions. Now face the array-backed stack puzzle to open the main gate.</p>
            <button type="button" data-testid="practice-continue" onClick={() => challengeStore.closeChallenge(true)}>
              Continue to gate puzzle
            </button>
          </section>
        ) : question ? (
          <section className="quiz-challenge-question">
            <p className="quiz-challenge-progress">
              Round {challenge.currentQuestionIndex + 1} of {challenge.quizQuestions.length} · {question?.difficulty?.toUpperCase() ?? 'ARRAYS'}
            </p>
            <h3 data-question-id={question.id} data-question-difficulty={question.difficulty}>
              {question.prompt}
            </h3>

            {!challenge.quizAnswerPending ? (
              <div className="quiz-challenge-options">
                {question.options.map((option, index) => (
                  <button
                    type="button"
                    key={option}
                    data-testid={`quiz-answer-${index}`}
                    onClick={() => challengeStore.answerQuiz(index)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <>
                {challenge.feedback && (
                  <p
                    className={`array-challenge-feedback${challenge.feedback.isError ? ' is-error' : ' is-success'}`}
                    data-testid="quiz-feedback"
                    role="status"
                  >
                    {challenge.feedback.message}
                  </p>
                )}
                <button
                  type="button"
                  className="quiz-challenge-continue"
                  data-testid="quiz-next"
                  onClick={() => challengeStore.advanceQuiz()}
                >
                  {challenge.heartsRemaining === 0
                    ? 'See what happens next'
                    : challenge.currentQuestionIndex + 1 === challenge.quizQuestions.length
                      ? 'Finish quiz'
                      : 'Next question'}
                </button>
              </>
            )}
          </section>
        ) : null}
      </section>
    </div>
  )
}

/**
 * The Samurai's three-question trial overlay. Deliberately separate scoring:
 * no hearts, no question history, and a fixed 2/3 pass threshold. Closing a
 * passed trial hands the result to the scene, which persists the side-quest
 * stage advance; closing a failed trial simply returns to the Samurai.
 */
function VillageTrainingTrial() {
  const challenge = useChallengeState()
  const question = challenge.quizQuestions[challenge.currentQuestionIndex]

  return (
    <div
      className="array-challenge-overlay quiz-challenge-overlay"
      data-testid="trial-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Samurai training trial"
    >
      <section className="array-challenge-panel quiz-challenge-panel">
        <header className="array-challenge-header">
          <div>
            <p className="array-challenge-eyebrow">Samurai's Training Trial</p>
            <h2>Three-question trial</h2>
          </div>
          <div className="quiz-challenge-header-actions">
            <span className="trial-score" data-testid="trial-score" role="img" aria-label={`${challenge.correctAnswers} correct so far`}>
              Score: {challenge.correctAnswers}
            </span>
            <button
              type="button"
              className="array-challenge-close"
              data-testid="trial-close"
              onClick={() => challengeStore.closeChallenge(false)}
              aria-label="Leave trial"
            >
              ×
            </button>
          </div>
        </header>

        {challenge.quizStatus === 'failed' ? (
          <section className="quiz-challenge-result is-failed" data-testid="trial-failed">
            <h3>Trial not passed</h3>
            <p>
              You answered {challenge.correctAnswers} of {challenge.quizQuestions.length} correctly.
              At least {VILLAGE_TRAINING_TRIAL_PASS_THRESHOLD} are required. Speak to the Samurai again to retry.
            </p>
            <button type="button" onClick={() => challengeStore.closeChallenge(false)}>
              Return to the Samurai
            </button>
          </section>
        ) : challenge.quizStatus === 'passed' ? (
          <section className="quiz-challenge-result is-passed" data-testid="trial-passed">
            <h3>Trial passed!</h3>
            <p>
              You answered {challenge.correctAnswers} of {challenge.quizQuestions.length} correctly.
              Report your success to the Village Guide.
            </p>
            <button type="button" data-testid="trial-acknowledge-pass" onClick={() => challengeStore.closeChallenge(true)}>
              Return to the Samurai
            </button>
          </section>
        ) : question ? (
          <section className="quiz-challenge-question">
            <p className="quiz-challenge-progress">
              Round {challenge.currentQuestionIndex + 1} of {challenge.quizQuestions.length} · {question?.difficulty?.toUpperCase() ?? 'ARRAYS'}
            </p>
            <h3 data-question-id={question.id} data-question-difficulty={question.difficulty}>
              {question.prompt}
            </h3>

            {!challenge.quizAnswerPending ? (
              <div className="quiz-challenge-options">
                {question.options.map((option, index) => (
                  <button
                    type="button"
                    key={option}
                    data-testid={`trial-answer-${index}`}
                    onClick={() => challengeStore.answerTrialQuestion(index)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <>
                {challenge.feedback && (
                  <p
                    className={`array-challenge-feedback${challenge.feedback.isError ? ' is-error' : ' is-success'}`}
                    data-testid="trial-feedback"
                    role="status"
                  >
                    {challenge.feedback.message}
                  </p>
                )}
                <button
                  type="button"
                  className="quiz-challenge-continue"
                  data-testid="trial-next"
                  onClick={() => challengeStore.advanceTrialQuestion()}
                >
                  {challenge.currentQuestionIndex + 1 === challenge.quizQuestions.length
                    ? 'Finish trial'
                    : 'Next question'}
                </button>
              </>
            )}
          </section>
        ) : null}
      </section>
    </div>
  )
}
