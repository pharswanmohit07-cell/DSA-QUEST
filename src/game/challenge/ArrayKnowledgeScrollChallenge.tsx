import { useState } from 'react'
import { playGameOverJingle } from '../../audio/soundEffects'
import { challengeStore, useChallengeState } from './challengeStore'
import { runSolution } from '../quests/challenges/runSolution'
import type { ChallengeCaseResult } from '../quests/questTypes'
import {
  selectArrayScrollQuestions,
  type HardArrayQuestion,
  type HardExpected,
  type HardInput,
} from './arrayScrollQuestionBank'

const HEART_LIMITS = [3, 2, 1] as const

function normalizeNumberSequence(value: string): number[] {
  return (value.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
}

function evaluateHardQuestion(candidate: unknown, question: HardArrayQuestion): ChallengeCaseResult[] {
  if (typeof candidate !== 'function') {
    return question.testCases.map((testCase) => ({
      label: testCase.label,
      passed: false,
      actual: 'Your function was not found',
      expected: JSON.stringify(testCase.expected),
    }))
  }

  const solution = candidate as (input: HardInput) => unknown
  return question.testCases.map((testCase) => {
    try {
      const input = Array.isArray(testCase.input)
        ? [...testCase.input]
        : testCase.input as string
      const actual = solution(input)
      const expected = testCase.expected as HardExpected
      const passed = JSON.stringify(actual) === JSON.stringify(expected)
      return {
        label: testCase.label,
        passed,
        actual: JSON.stringify(actual),
        expected: JSON.stringify(expected),
      }
    } catch (error) {
      return {
        label: testCase.label,
        passed: false,
        actual: error instanceof Error ? error.message : 'Your function raised an error',
        expected: JSON.stringify(testCase.expected),
      }
    }
  })
}

export function ArrayKnowledgeScrollChallenge() {
  const challenge = useChallengeState()
  const isActive = challenge.activeChallenge === 'array-knowledge-scroll'
  const [questions] = useState(() => selectArrayScrollQuestions())

  const [round, setRound] = useState(0)
  const [livesRemaining, setLivesRemaining] = useState<number>(HEART_LIMITS[0])
  const [mediumAnswer, setMediumAnswer] = useState('')
  const [solution, setSolution] = useState(() => questions.hard.starterCode)
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null)
  const [wrongAnswerPrompt, setWrongAnswerPrompt] = useState<string | null>(null)
  const [hardResults, setHardResults] = useState<ChallengeCaseResult[] | null>(null)
  const [compileError, setCompileError] = useState<string | null>(null)
  const [isEarned, setIsEarned] = useState(false)

  if (!isActive) return null

  const easyQuestion = questions.easy
  const mediumQuestion = questions.medium
  const hardQuestion = questions.hard

  const loseHeart = (message: string) => {
    const nextLives = Math.max(0, livesRemaining - 1)
    setLivesRemaining(nextLives)
    if (nextLives === 0) playGameOverJingle()
    setFeedback(null)
    setWrongAnswerPrompt(message)
  }

  const submitEasyAnswer = (index: number) => {
    if (index === easyQuestion.correctAnswerIndex) {
      setFeedback(null)
      setWrongAnswerPrompt(null)
      setRound(1)
      setLivesRemaining(HEART_LIMITS[1])
      setMediumAnswer('')
      return
    }
    loseHeart(easyQuestion.explanation)
  }

  const submitMediumAnswer = () => {
    const answer = normalizeNumberSequence(mediumAnswer)
    const isCorrect = answer.length === mediumQuestion.expected.length &&
      answer.every((value, index) => value === mediumQuestion.expected[index])

    if (isCorrect) {
      setFeedback(null)
      setWrongAnswerPrompt(null)
      setRound(2)
      setLivesRemaining(HEART_LIMITS[2])
      setSolution(hardQuestion.starterCode)
      setHardResults(null)
      setCompileError(null)
      return
    }
    loseHeart(mediumQuestion.explanation)
  }

  const runHardSolution = () => {
    const outcome = runSolution(
      solution,
      (candidate) => evaluateHardQuestion(candidate, hardQuestion),
      hardQuestion.functionName,
    )

    if (!outcome.ok) {
      setHardResults(null)
      setCompileError(outcome.error)
      loseHeart('Your code could not be checked. Review the function name, loops, and matching brackets, then try again.')
      return
    }

    setCompileError(null)
    setHardResults(outcome.cases)
    const passed = outcome.cases.every((testCase) => testCase.passed)
    if (passed) {
      setIsEarned(true)
      challengeStore.markKnowledgeScrollTrialComplete()
      setFeedback({
        success: true,
        message: 'Every test passed. You have earned the Arrays Knowledge Scroll!',
      })
      setWrongAnswerPrompt(null)
    } else {
      loseHeart('One or more test cases failed. Use the examples and hint to check your logic.')
    }
  }

  const close = () => challengeStore.closeChallenge(false)
  const outOfHearts = wrongAnswerPrompt !== null && livesRemaining === 0
  const roundNames = ['Easy', 'Medium', 'Hard'] as const
  const roundHeartLimit = HEART_LIMITS[round]

  return (
    <div
      className="array-challenge-overlay quiz-challenge-overlay knowledge-scroll-overlay"
      data-testid="scroll-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Arrays Knowledge Scroll challenge"
    >
      <section className="array-challenge-panel quiz-challenge-panel knowledge-scroll-panel">
        <header className="array-challenge-header knowledge-scroll-header">
          <div>
            <p className="array-challenge-eyebrow">Village Guide's Challenge</p>
            <h2>Knowledge Scroll</h2>
            <p className="knowledge-scroll-subtitle">Three trials. Fewer chances at each stage.</p>
          </div>
          <div className="knowledge-scroll-header-actions">
            <div
              className="knowledge-scroll-hearts"
              data-testid="scroll-hearts"
              role="img"
              aria-label={livesRemaining + ' of ' + roundHeartLimit + ' hearts remaining in the ' + roundNames[round] + ' round'}
            >
              {Array.from({ length: roundHeartLimit }, (_, index) => (
                <span key={index} className={index < livesRemaining ? 'is-full' : ''} aria-hidden="true">
                  {index < livesRemaining ? '♥' : '♡'}
                </span>
              ))}
            </div>
            <button
              type="button"
              className="array-challenge-close"
              data-testid="scroll-close"
              onClick={close}
              aria-label="Leave Knowledge Scroll challenge"
            />
          </div>
        </header>

        <nav className="knowledge-scroll-steps" aria-label="Challenge rounds">
          <span className={round === 0 ? 'is-current' : round > 0 ? 'is-done' : ''}>1 · Easy</span>
          <span className={round === 1 ? 'is-current' : round > 1 ? 'is-done' : ''}>2 · Medium</span>
          <span className={round === 2 ? 'is-current' : ''}>3 · Hard</span>
        </nav>

        {round === 0 ? (
          <section
            className="quiz-challenge-question knowledge-scroll-task"
            data-testid="scroll-easy-round"
            data-question-id={easyQuestion.id}
          >
            <p className="quiz-challenge-progress">EASY · Arrays and basic operations</p>
            <h3>{easyQuestion.prompt}</h3>
            <div className="knowledge-scroll-array-pair">
              {easyQuestion.arrays.map((array) => (
                <p key={array.label}>
                  <strong>{array.label}</strong>
                  <span>[{array.values.join(', ')}]</span>
                </p>
              ))}
            </div>
            <p className="knowledge-scroll-instructions">{easyQuestion.instruction}</p>
            <div className="knowledge-scroll-options">
              {easyQuestion.options.map((option, index) => (
                <button
                  key={easyQuestion.id + '-' + option}
                  type="button"
                  data-testid={'scroll-easy-option-' + index}
                  onClick={() => submitEasyAnswer(index)}
                >
                  <span>{String.fromCharCode(65 + index)}.</span> {option}
                </button>
              ))}
            </div>
          </section>
        ) : round === 1 ? (
          <section
            className="quiz-challenge-question knowledge-scroll-task"
            data-testid="scroll-medium-round"
            data-question-id={mediumQuestion.id}
          >
            <p className="quiz-challenge-progress">MEDIUM · Array problem solving</p>
            <h3>{mediumQuestion.prompt}</h3>
            <div className="knowledge-scroll-array-pair">
              {mediumQuestion.arrays.map((array) => (
                <p key={array.label}>
                  <strong>{array.label}</strong>
                  <span>[{array.values.join(', ')}]</span>
                </p>
              ))}
            </div>
            <p className="knowledge-scroll-instructions">{mediumQuestion.hint}</p>
            <label className="knowledge-scroll-field-label" htmlFor="scroll-medium-answer">Your answer</label>
            <input
              id="scroll-medium-answer"
              data-testid="scroll-medium-input"
              className="knowledge-scroll-input"
              value={mediumAnswer}
              onChange={(event) => setMediumAnswer(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') submitMediumAnswer() }}
              placeholder="Enter the resulting values, e.g. [5, 4, 3]"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              className="quiz-challenge-continue"
              data-testid="scroll-medium-submit"
              onClick={submitMediumAnswer}
            >
              Check answer
            </button>
          </section>
        ) : (
          <section
            className="quiz-challenge-question knowledge-scroll-task"
            data-testid="scroll-hard-round"
            data-question-id={hardQuestion.id}
          >
            <p className="quiz-challenge-progress">HARD · Coding challenge</p>
            <h3>{hardQuestion.prompt}</h3>
            <div className="knowledge-scroll-palindrome-examples">
              {hardQuestion.examples.map((example) => <p key={example}>{example}</p>)}
            </div>
            <p className="knowledge-scroll-instructions">{hardQuestion.hint}</p>
            <textarea
              data-testid="scroll-hard-editor"
              className="knowledge-scroll-editor"
              value={solution}
              onChange={(event) => setSolution(event.target.value)}
              spellCheck={false}
              aria-label={'Write the ' + hardQuestion.functionName + ' function'}
            />
            <button
              type="button"
              className="quiz-challenge-continue"
              data-testid="scroll-hard-run"
              onClick={runHardSolution}
            >
              Run code tests
            </button>
            {compileError && <p className="knowledge-scroll-compile-error" role="alert">{compileError}</p>}
            {hardResults && (
              <div className="knowledge-scroll-test-results" data-testid="scroll-hard-results">
                <h4>{hardResults.filter((testCase) => testCase.passed).length} / {hardResults.length} tests passed</h4>
                {hardResults.map((testCase) => (
                  <p key={testCase.label} className={testCase.passed ? 'is-passed' : 'is-failed'}>
                    <strong>{testCase.passed ? 'PASS' : 'FAIL'}</strong> · {testCase.label}: got {testCase.actual}, expected {testCase.expected}
                  </p>
                ))}
              </div>
            )}
          </section>
        )}

        {feedback && (
          <p
            className={'knowledge-scroll-feedback ' + (feedback.success ? 'is-success' : 'is-error')}
            data-testid="scroll-feedback"
            role="status"
          >
            {feedback.message}
          </p>
        )}

        {wrongAnswerPrompt && (
          <div className="knowledge-scroll-wrong-overlay">
            <section
              className="knowledge-scroll-wrong-popup"
              data-testid="scroll-wrong-answer-popup"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="scroll-wrong-answer-title"
              aria-describedby="scroll-wrong-answer-message"
            >
              <p className="knowledge-scroll-wrong-kicker">
                {outOfHearts ? 'NO HEARTS LEFT' : 'ANSWER NOT QUITE RIGHT'}
              </p>
              <h3 id="scroll-wrong-answer-title">
                {outOfHearts ? 'Return to the Village Guide' : 'Try again!'}
              </h3>
              <p id="scroll-wrong-answer-message">
                {outOfHearts
                  ? 'You have used all your hearts for this round. Speak to the Village Guide again when you are ready to face a new set of questions.'
                  : wrongAnswerPrompt}
              </p>
              <button
                type="button"
                data-testid={outOfHearts ? 'scroll-return-to-old-man' : 'scroll-wrong-answer-retry'}
                onClick={() => {
                  if (outOfHearts) challengeStore.closeChallenge(false)
                  else setWrongAnswerPrompt(null)
                }}
              >
                {outOfHearts ? 'Return to the Village Guide' : 'Try again'}
              </button>
            </section>
          </div>
        )}

        {isEarned && (
          <section className="quiz-challenge-result is-passed knowledge-scroll-earned" data-testid="scroll-earned">
            <h3>Arrays Knowledge Scroll earned!</h3>
            <p>You completed three different array and coding challenges. The first Knowledge Scroll is yours.</p>
            <button type="button" data-testid="scroll-claim" onClick={() => challengeStore.closeChallenge(true)}>
              Claim Arrays Knowledge Scroll
            </button>
          </section>
        )}
      </section>
    </div>
  )
}
