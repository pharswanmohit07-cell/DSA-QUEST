import { challengeStore, useChallengeState } from './challengeStore'
import './samuraiStackChallenge.css'

export function SamuraiStackQuiz() {
  const challenge = useChallengeState()
  if (challenge.activeChallenge !== 'samurai-stack-quiz') return null

  const question = challenge.quizQuestions[challenge.currentQuestionIndex]
  const failed = challenge.quizStatus === 'failed'

  return (
    <div className="array-challenge-overlay quiz-challenge-overlay samurai-stack-overlay" role="dialog" aria-modal="true" aria-label="Samurai Stack Operations quiz">
      <section className="array-challenge-panel quiz-challenge-panel samurai-stack-panel">
        <header className="array-challenge-header array-practice-header">
          <div>
            <p className="array-challenge-eyebrow">SAMURAI • STACK OPERATIONS</p>
            <h2>Dojo Knowledge Check</h2>
          </div>
          <div className="quiz-challenge-header-actions">
            <div className="quiz-challenge-hearts" role="img" aria-label={challenge.heartsRemaining + ' of 3 hearts remaining'}>
              {[0, 1, 2].map((heart) => <span key={heart} className={heart < challenge.heartsRemaining ? 'is-full' : 'is-empty'}>♥</span>)}
            </div>
            <button type="button" className="array-challenge-close" aria-label="Leave Stack quiz" onClick={() => challengeStore.closeChallenge(false)}>×</button>
          </div>
        </header>

        {failed ? (
          <section className="quiz-challenge-result is-failed" data-testid="samurai-stack-quiz-failed">
            <p className="quiz-challenge-progress">THE DOJO IS STILL WAITING</p>
            <h3>Return to your lesson and try again.</h3>
            <p>You answered {challenge.correctAnswers} of {challenge.quizQuestions.length} correctly. The next attempt will draw fresh questions from the Stack bank.</p>
            <button type="button" className="array-challenge-primary" onClick={() => challengeStore.retrySamuraiStackQuiz()} data-testid="samurai-stack-quiz-retry">Try again</button>
          </section>
        ) : question ? (
          <section className="quiz-challenge-question">
            <p className="quiz-challenge-progress">QUESTION {challenge.currentQuestionIndex + 1} OF {challenge.quizQuestions.length} · {question.difficulty.toUpperCase()}</p>
            <h3 data-question-id={question.id}>{question.prompt}</h3>
            {!challenge.quizAnswerPending ? (
              <div className="quiz-challenge-options">
                {question.options.map((option, index) => (
                  <button key={question.id + '-' + option} type="button" data-testid={'samurai-stack-answer-' + index} onClick={() => challengeStore.answerSamuraiStackQuiz(index)}>
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className={'quiz-challenge-feedback ' + (challenge.feedback?.isError ? 'is-error' : 'is-correct')} data-testid="samurai-stack-quiz-feedback">
                  {challenge.feedback?.message}
                </div>
                <button type="button" className="array-challenge-primary quiz-challenge-continue" onClick={() => challengeStore.advanceSamuraiStackQuiz()}>
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
