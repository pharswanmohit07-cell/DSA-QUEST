import { useState } from 'react'
import { challengeStore, useChallengeState } from './challengeStore'
import type { StackOp } from './challengeTypes'
import './arrayChallenge.css'

function describeOperation(op: StackOp): string {
  return op.type === 'push' ? `Push ${op.value}` : 'Pop'
}

export function ArrayChallenge() {
  const challenge = useChallengeState()
  const [pushValue, setPushValue] = useState('')

  if (challenge.activeChallenge !== 'array-stack-operations') {
    return null
  }

  const push = () => {
    const value = Number(pushValue)
    if (pushValue.trim() === '' || !Number.isFinite(value)) {
      challengeStore.setFeedback('Enter a valid number before pushing it onto the stack.')
      return
    }
    if (challengeStore.executeOp({ type: 'push', value })) {
      setPushValue('')
    }
  }

  const pop = () => {
    challengeStore.executeOp({ type: 'pop' })
  }

  return (
    <div className="array-challenge-overlay" data-testid="challenge-overlay" role="dialog" aria-modal="true" aria-label="Village gate-opening challenge">
      <section className="array-challenge-panel">
        <header className="array-challenge-header">
          <div>
            <p className="array-challenge-eyebrow">Old Man's Gate Puzzle</p>
            <h2>Open the Village Gate</h2>
          </div>
          {!challenge.isComplete && (
            <button
              type="button"
              className="array-challenge-close"
              data-testid="challenge-close"
              onClick={() => challengeStore.closeChallenge(false)}
              aria-label="Leave challenge"
            >
              ×
            </button>
          )}
        </header>

        <p className="array-challenge-description">
          The village gate is sealed. Complete the sequence of actions to unlock the path ahead. Each move changes what the gate mechanism holds. Push adds a value to the mechanism; Pop removes the most recent value.
        </p>

        <section className="array-challenge-target" aria-label="Target operations">
          <h3>Target sequence</h3>
          <ol>
            {challenge.targetOps.map((op, index) => (
              <li
                key={`${op.type}-${op.value ?? ''}-${index}`}
                className={index < challenge.completedOps.length ? 'is-complete' : ''}
              >
                {describeOperation(op)}
              </li>
            ))}
          </ol>
        </section>

        <div className="array-challenge-workspace">
          <section className="array-challenge-stack" aria-label="Current stack">
            <div className="array-challenge-stack-heading">
              <h3>Array storage (stack view)</h3>
              <button
                type="button"
                className={`array-challenge-vision${challenge.dsaVisionEnabled ? ' is-on' : ''}`}
                data-testid="dsa-vision-toggle"
                aria-pressed={challenge.dsaVisionEnabled}
                onClick={() => challengeStore.toggleDsaVision()}
              >
                DSA Vision: {challenge.dsaVisionEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {challenge.currentStack.length === 0 ? (
              <div className="array-challenge-empty">Array storage is empty</div>
            ) : (
              <ol className="array-challenge-stack-items">
                {challenge.currentStack.map((value, index) => {
                  const isTop = index === challenge.currentStack.length - 1
                  return (
                    <li key={`${index}-${value}`} className={isTop ? 'is-top' : ''}>
                      {challenge.dsaVisionEnabled && <span className="array-challenge-index">[{index}]</span>}
                      <span className="array-challenge-value">{value}</span>
                      {isTop && <span className="array-challenge-top">TOP</span>}
                    </li>
                  )
                })}
              </ol>
            )}
          </section>

          <section className="array-challenge-controls" aria-label="Stack controls">
            <label htmlFor="array-challenge-push-value">Value to push</label>
            <div className="array-challenge-push-row">
              <input
                id="array-challenge-push-value"
                data-testid="stack-push-value"
                type="number"
                value={pushValue}
                disabled={challenge.isComplete}
                onChange={(event) => setPushValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    push()
                  }
                }}
              />
              <button
                type="button"
                data-testid="stack-push"
                disabled={challenge.isComplete}
                onClick={push}
              >
                Push
              </button>
            </div>
            <button
              type="button"
              className="array-challenge-pop"
              data-testid="stack-pop"
              disabled={challenge.isComplete}
              onClick={pop}
            >
              Pop
            </button>
          </section>
        </div>

        {challenge.feedback && (
          <p
            className={`array-challenge-feedback${challenge.feedback.isError ? ' is-error' : ' is-success'}`}
            data-testid="challenge-feedback"
            role={challenge.feedback.isError ? 'alert' : 'status'}
          >
            {challenge.feedback.message}
          </p>
        )}

        {challenge.isComplete && (
          <div className="gate-opened-popup-overlay" role="presentation">
            <section
              className="gate-opened-popup"
              data-testid="gate-opened-popup"
              role="dialog"
              aria-modal="true"
              aria-labelledby="gate-opened-title"
            >
              <h3 id="gate-opened-title">VILLAGE GATE OPENED!</h3>
              <p>You solved the Old Man's array challenge. The main entrance to the village is now open. A new path is waiting beyond the gate.</p>
              <button
                type="button"
                data-testid="challenge-continue"
                onClick={() => challengeStore.closeChallenge(true)}
              >
                Continue into the village
              </button>
            </section>
          </div>
        )}
      </section>
    </div>
  )
}
