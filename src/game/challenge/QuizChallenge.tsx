import { useEffect } from 'react'
import { challengeStore, useChallengeState } from './challengeStore'
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
      aria-label="Array knowledge quiz"
    >
      <section className="array-challenge-panel quiz-challenge-panel">
        <header className="array-challenge-header">
          <div>
            <p className="array-challenge-eyebrow">Elder Hiro's Array Lesson</p>
            <h2>Three-question check</h2>
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
              data-testid="quiz-close"
              onClick={() => challengeStore.closeChallenge(false)}
              aria-label="Leave quiz"
            >
              ×
            </button>
          </div>
        </header>

        {challenge.quizStatus === 'failed' ? (
          <section className="quiz-challenge-result is-failed" data-testid="quiz-failed">
            <h3>Come back and try again</h3>
            <p>Come back and talk to Elder Hiro again to retry. The gate is still locked.</p>
            <button type="button" onClick={() => challengeStore.closeChallenge(false)}>
              Return to Elder Hiro
            </button>
          </section>
        ) : challenge.quizStatus === 'passed' ? (
          <section className="quiz-challenge-result is-passed" data-testid="quiz-passed">
            <h3>Array lesson complete!</h3>
            <p>You kept at least one heart. Now put your knowledge to work with a hands-on stack challenge.</p>
            <button type="button" onClick={() => challengeStore.beginStackPractice()}>
              Begin Stack Practice
            </button>
          </section>
        ) : question ? (
          <section className="quiz-challenge-question">
            <p className="quiz-challenge-progress">
              Question {challenge.currentQuestionIndex + 1} of {challenge.quizQuestions.length}
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
