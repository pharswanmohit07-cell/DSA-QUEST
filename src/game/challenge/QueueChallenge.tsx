import { useState } from 'react'
import { CampaignChallengeFrame } from './CampaignChallengeFrame'
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
    <CampaignChallengeFrame
      npcLabel="FARMER • QUEUE OPERATIONS"
      title="Restore the Supply Line"
      ariaLabel="Village Supply Crisis queue challenge"
      stageLabel="IMPLEMENT • GUIDED PRACTICE"
      progressLabel={challenge.queueStepIndex + ' / ' + QUEUE_SUPPLY_STEPS.length + ' STEPS'}
      onClose={challenge.isComplete ? undefined : () => challengeStore.closeChallenge(false)}
      closeLabel="Leave Queue challenge"
      closeTestId="queue-challenge-close"
      overlayClassName="queue-challenge-overlay"
      panelClassName="queue-challenge-panel"
    >
      <section className="campaign-challenge-howto" data-testid="queue-guided-how-to-play">
        <h3>HOW TO PLAY</h3>
        <p><strong>Goal:</strong> follow the 15-step supply plan and finish with an empty queue.</p>
        <ul>
          <li><strong>Enqueue:</strong> add the new supply at the REAR.</li>
          <li><strong>Dequeue:</strong> remove the oldest supply from the FRONT.</li>
          <li><strong>Front / Rear:</strong> inspect an end without changing the queue.</li>
        </ul>
        <p>The line has {challenge.queueCapacity} spaces. A new enqueue while full is overflow; a dequeue while empty is underflow. Follow the step plan and watch the live queue update.</p>
      </section>
        <section className="array-challenge-target" aria-label="Supply line plan">
          <h3>Supply plan</h3>
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
    </CampaignChallengeFrame>
  )
}
