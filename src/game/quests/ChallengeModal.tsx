import { useCallback, useState } from 'react'
import { QuestManager, useQuestState } from './QuestManager'
import { getChallenge } from './challenges/arraySorting'
import { runSolution } from './challenges/runSolution'
import type { ChallengeCaseResult } from './questTypes'
import './challengeModal.css'

type ChallengeModalProps = {
  /** Called after a passing submission so the scene can unlock the gate. */
  onSolved: () => void
  /** Called when the modal is dismissed, so the scene can resume. */
  onClose: () => void
}

export function ChallengeModal({ onSolved, onClose }: ChallengeModalProps) {
  const questState = useQuestState()
  const challengeId = questState.challenge
  const [code, setCode] = useState('')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [cases, setCases] = useState<ChallengeCaseResult[] | null>(null)
  const [compileError, setCompileError] = useState<string | null>(null)
  const [solved, setSolved] = useState(false)

  const close = useCallback(() => {
    QuestManager.closeChallenge()
    setCode('')
    setCases(null)
    setCompileError(null)
    setSelectedOption(null)
    setSolved(false)
    onClose()
  }, [onClose])

  const runTests = useCallback(() => {
    if (!challengeId) {
      return
    }
    const challenge = getChallenge(challengeId)

    if (challenge.options.length > 0) {
      // Multiple-choice challenges still run the code, but only a correct
      // algorithm counts as a pass.
      if (selectedOption !== challenge.correctOptionId) {
        setCases(null)
        setCompileError('That is not the algorithm this exercise is looking for. Pick the right technique and run the tests again.')
        return
      }
    }

    const outcome = runSolution(code, (fn) => challenge.evaluate(fn as never))
    if (!outcome.ok) {
      setCases(null)
      setCompileError(outcome.error)
      return
    }

    setCompileError(null)
    setCases(outcome.cases)

    const allPassed = outcome.cases.every((testCase) => testCase.passed)
    if (allPassed) {
      setSolved(true)
      QuestManager.submitChallenge({ challengeId, passed: true, cases: outcome.cases })
      // Solving is proof of completion, so the quest is started first and then
      // completed. This keeps the result correct however the modal was reached.
      QuestManager.startQuest('array-sorting-challenge')
      QuestManager.completeQuest('array-sorting-challenge')
      onSolved()
    } else {
      QuestManager.submitChallenge({ challengeId, passed: false, cases: outcome.cases })
    }
  }, [challengeId, code, onSolved, selectedOption])

  if (!challengeId) {
    return null
  }

  const challenge = getChallenge(challengeId)
  const passedCount = cases?.filter((testCase) => testCase.passed).length ?? 0

  return (
    <div className="challenge-overlay" data-testid="challenge-overlay" role="dialog" aria-label={challenge.title}>
      <div className="challenge-modal" data-testid="challenge-modal">
        <header className="challenge-header">
          <div>
            <p className="challenge-eyebrow">Quest Challenge</p>
            <h2 className="challenge-title">{challenge.title}</h2>
          </div>
          <span className="challenge-difficulty">{challenge.difficulty}</span>
        </header>

        <div className="challenge-body">
          <section className="challenge-brief">
            <pre className="challenge-prompt">{challenge.prompt}</pre>

            <h3>Requirements</h3>
            <ul className="challenge-list">
              {challenge.instructions.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>

            <h3>Notes</h3>
            <ul className="challenge-list">
              {challenge.constraints.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          <section className="challenge-workspace">
            <label className="challenge-label" htmlFor="challenge-code">
              Your solution
            </label>
            <textarea
              id="challenge-code"
              data-testid="challenge-code"
              className="challenge-editor"
              spellCheck={false}
              value={code}
              placeholder={challenge.starterCode}
              onChange={(event) => setCode(event.target.value)}
            />

            <fieldset className="challenge-options">
              <legend className="challenge-label">Which technique do you use?</legend>
              {challenge.options.map((option) => (
                <label key={option.id} className="challenge-option">
                  <input
                    type="radio"
                    name="technique"
                    value={option.id}
                    checked={selectedOption === option.id}
                    onChange={() => setSelectedOption(option.id)}
                    data-testid={`challenge-option-${option.id}`}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </fieldset>

            <button type="button" className="challenge-run" data-testid="challenge-run" onClick={runTests}>
              Run tests
            </button>

            {compileError && (
              <p className="challenge-error" data-testid="challenge-error">
                {compileError}
              </p>
            )}

            {cases && !solved && (
              <div className="challenge-cases" data-testid="challenge-cases">
                <p className="challenge-cases-summary">
                  {passedCount} of {cases.length} tests passed
                </p>
                <ul>
                  {cases.map((testCase) => (
                    <li key={testCase.label} className={testCase.passed ? 'is-pass' : 'is-fail'}>
                      <span className="case-mark">{testCase.passed ? 'PASS' : 'FAIL'}</span>
                      <span className="case-label">{testCase.label}</span>
                      {!testCase.passed && (
                        <span className="case-detail">
                          got {testCase.actual}, expected {testCase.expected}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {solved && (
              <p className="challenge-success" data-testid="challenge-success">
                Correct. The ward falls and the village gate is open.
              </p>
            )}
          </section>
        </div>

        <footer className="challenge-footer">
          <button type="button" className="challenge-close" data-testid="challenge-close" onClick={close}>
            {solved ? 'Continue' : 'Walk away'}
          </button>
        </footer>
      </div>
    </div>
  )
}
