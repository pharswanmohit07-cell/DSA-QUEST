import { useState } from 'react'
import { challengeStore, useChallengeState } from './challengeStore'
import { QUEUE_SUPPLY_STEPS } from './queueChallenge'
import './arrayChallenge.css'
import './queueChallenge.css'

export function QueueChallenge() {
  const challenge = useChallengeState()
  const [enqueueValue, setEnqueueValue] = useState('')

  if (challenge.activeChallenge !== 'queue-village-supply') {
    return null
  }

  const enqueue = () => {
    if (enqueueValue.trim() === '') {
      challengeStore.setFeedback('Enter a supply number before enqueueing it.')
      return
    }
    const value = Number(enqueueValue)
    if (challengeStore.executeQueueOp({ type: 'enqueue', value })) {
      setEnqueueValue('')
    }
  }

  const execute = (type: 'dequeue' | 'front' | 'rear') => {
    challengeStore.executeQueueOp({ type })
  }

  const frontValue = challenge.currentQueue[0]
  const rearValue = challenge.currentQueue[challenge.currentQueue.length - 1]

  return (
    <div
      className="array-challenge-overlay queue-challenge-overlay"
      data-testid="queue-challenge-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Village Supply Crisis queue challenge"
    >
      <section className="array-challenge-panel queue-challenge-panel">
        <header className="array-challenge-header">
          <div>
            <p className="array-challenge-eyebrow">Village Supply Crisis</p>
            <h2>Restore the Supply Line</h2>
          </div>
          {!challenge.isComplete && (
            <button
              type="button"
              className="array-challenge-close"
              data-testid="queue-challenge-close"
              onClick={() => challengeStore.closeChallenge(false)}
              aria-label="Leave queue challenge"
            >
              ×
            </button>
          )}
        </header>

        <p className="array-challenge-description">
          A queue follows <strong>First In, First Out (FIFO)</strong>. New supplies join the rear;
          the oldest supply leaves from the front. This line has room for {challenge.queueCapacity} supplies.
        </p>

        <section className="array-challenge-target" aria-label="Supply line plan">
          <h3>Supply plan · {challenge.queueStepIndex} / {QUEUE_SUPPLY_STEPS.length} steps</h3>
          <ol>
            {QUEUE_SUPPLY_STEPS.map((step, index) => (
              <li
                key={`${step.label}-${index}`}
                className={[
                  index < challenge.queueStepIndex ? 'is-complete' : '',
                  index === challenge.queueStepIndex ? 'is-current' : '',
                ].filter(Boolean).join(' ')}
                aria-current={index === challenge.queueStepIndex ? 'step' : undefined}
              >
                {step.label}
              </li>
            ))}
          </ol>
        </section>

        <div className="queue-challenge-workspace">
          <section className="queue-challenge-board" aria-label="Live supply queue">
            <div className="queue-challenge-board-heading">
              <h3>Queue</h3>
              <span>{challenge.currentQueue.length} / {challenge.queueCapacity} spaces</span>
            </div>
            {challenge.currentQueue.length === 0 ? (
              <div className="array-challenge-empty">The supply queue is empty.</div>
            ) : (
              <ol className="queue-challenge-items">
                {challenge.currentQueue.map((value, index) => (
                  <li key={`${index}-${value}`}>
                    <span className="queue-challenge-marker">
                      {index === 0 ? 'FRONT' : index === challenge.currentQueue.length - 1 ? 'REAR' : 'WAITING'}
                    </span>
                    <strong>{value}</strong>
                  </li>
                ))}
              </ol>
            )}
            <div className="queue-challenge-ends">
              <p>Front <strong>{frontValue ?? '—'}</strong></p>
              <p>Rear <strong>{rearValue ?? '—'}</strong></p>
            </div>
          </section>

          <section className="array-challenge-controls queue-challenge-controls" aria-label="Queue controls">
            <label htmlFor="queue-challenge-value">Supply number to enqueue</label>
            <div className="array-challenge-push-row">
              <input
                id="queue-challenge-value"
                data-testid="queue-enqueue-value"
                type="number"
                value={enqueueValue}
                disabled={challenge.isComplete}
                onChange={(event) => setEnqueueValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') enqueue()
                }}
              />
              <button
                type="button"
                data-testid="queue-enqueue"
                disabled={challenge.isComplete}
                onClick={enqueue}
              >
                Enqueue
              </button>
            </div>
            <div className="queue-challenge-peek-row">
              <button
                type="button"
                data-testid="queue-front"
                disabled={challenge.isComplete}
                onClick={() => execute('front')}
              >
                Front
              </button>
              <button
                type="button"
                data-testid="queue-rear"
                disabled={challenge.isComplete}
                onClick={() => execute('rear')}
              >
                Rear
              </button>
            </div>
            <button
              type="button"
              className="array-challenge-pop"
              data-testid="queue-dequeue"
              disabled={challenge.isComplete}
              onClick={() => execute('dequeue')}
            >
              Dequeue
            </button>
          </section>
        </div>

        {challenge.feedback && (
          <p
            className={`array-challenge-feedback${challenge.feedback.isError ? ' is-error' : ' is-success'}`}
            data-testid="queue-feedback"
            role={challenge.feedback.isError ? 'alert' : 'status'}
          >
            {challenge.feedback.message}
          </p>
        )}

        {challenge.isComplete && (
          <div className="array-challenge-success" data-testid="queue-success">
            <div>
              <p className="array-challenge-eyebrow">Supply line restored</p>
              <h3>Queue Challenge Complete!</h3>
              <p>Every supply reached the front and was served in its original arrival order.</p>
            </div>
            <button
              type="button"
              data-testid="queue-continue"
              onClick={() => challengeStore.closeChallenge(true)}
            >
              Continue Quest
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
