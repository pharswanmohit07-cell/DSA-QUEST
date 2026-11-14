import { challengeStore, useChallengeState } from './challengeStore'
import './samuraiStackChallenge.css'
import './farmerQueueChallenge.css'

export function FarmerQueueQuiz() {
  const challenge = useChallengeState()
  if (challenge.activeChallenge !== 'farmer-queue-final-quiz') return null

  const question = challenge.quizQuestions[challenge.currentQuestionIndex]
  const failed = challenge.quizStatus === 'failed'
  const passed = challenge.quizStatus === 'passed'

  return (
    <div className="array-challenge-overlay quiz-challenge-overlay samurai-stack-overlay farmer-queue-overlay" role="dialog" aria-modal="true" aria-label="Farmer Queue Operations final quiz">
      <section className="array-challenge-panel quiz-challenge-panel samurai-stack-panel farmer-queue-panel">
        <header className="array-challenge-header array-practice-header">
          <div>
            <p className="array-challenge-eyebrow">FARMER • QUEUE OPERATIONS</p>
            <h2>Supply Route Knowledge Check</h2>
          </div>
          <div className="quiz-challenge-header-actions">
            <div className="quiz-challenge-hearts" role="img" aria-label={challenge.heartsRemaining + ' of 3 hearts remaining'}>
              {[0, 1, 2].map((heart) => (
                <span key={heart} className={heart < challenge.heartsRemaining ? 'is-full' : 'is-empty'}>♥</span>
              ))}
            </div>
            {!passed && (
              <button
                type="button"
                className="array-challenge-close"
                aria-label="Leave Queue quiz"
                onClick={() => challengeStore.closeChallenge(false)}
              >
                ×
              </button>
            )}
          </div>
        </header>

        {failed ? (
          <section className="quiz-challenge-result is-failed" data-testid="farmer-queue-quiz-failed">
            <p className="quiz-challenge-progress">THE FARMER STILL NEEDS YOUR HELP</p>
            <h3>Review the queue rules and try again.</h3>
            <p>You answered {challenge.correctAnswers} of {challenge.quizQuestions.length} correctly. The next attempt will draw fresh questions from the Queue bank.</p>
            <button type="button" className="array-challenge-primary" onClick={() => challengeStore.retryFarmerQueueQuiz()} data-testid="farmer-queue-quiz-retry">
              Try again
            </button>
          </section>
        ) : passed ? (
          <section className="quiz-challenge-result is-passed" data-testid="farmer-queue-quiz-passed">
            <p className="quiz-challenge-progress">QUEUE KNOWLEDGE CHECK PASSED</p>
            <h3>The village route is in good hands.</h3>
            <p>You passed all three knowledge tiers. One independent delivery run remains before the Queue Relic and Linked List Bridge unlock.</p>
            <button type="button" className="array-challenge-primary" onClick={() => challengeStore.closeChallenge(true)} data-testid="farmer-queue-continue-to-delivery">
              Start independent delivery round
            </button>
          </section>
        ) : question ? (
          <section className="quiz-challenge-question">
            <p className="quiz-challenge-progress">
              QUESTION {challenge.currentQuestionIndex + 1} OF {challenge.quizQuestions.length} · {question.difficulty.toUpperCase()}
            </p>
            <h3>{question.prompt}</h3>
            <div className="quiz-challenge-options">
              {question.options.map((option, index) => (
                <button
                  key={option}
                  type="button"
                  className="quiz-challenge-option"
                  disabled={challenge.quizAnswerPending}
                  onClick={() => challengeStore.answerFarmerQueueQuiz(index)}
                  data-testid={'farmer-queue-quiz-option-' + index}
                >
                  <span>{String.fromCharCode(65 + index)}</span>
                  {option}
                </button>
              ))}
            </div>
            {challenge.feedback && (
              <>
                <div className={'quiz-challenge-feedback ' + (challenge.feedback.isError ? 'is-error' : 'is-correct')} data-testid="farmer-queue-quiz-feedback" role={challenge.feedback.isError ? 'alert' : 'status'}>
                  {challenge.feedback.message}
                </div>
                <button
                  type="button"
                  className="array-challenge-primary quiz-challenge-continue"
                  onClick={() => challengeStore.advanceFarmerQueueQuiz()}
                  data-testid="farmer-queue-quiz-next"
                >
                  {challenge.currentQuestionIndex + 1 === challenge.quizQuestions.length || challenge.heartsRemaining === 0 ? 'Finish quiz' : 'Next question'}
                </button>
              </>
            )}
          </section>
        ) : null}
      </section>
    </div>
  )
}
