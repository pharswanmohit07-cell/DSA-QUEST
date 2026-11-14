import { useState } from 'react'
import { CampaignChallengeFrame } from './CampaignChallengeFrame'
import { challengeStore, useChallengeState } from './challengeStore'
import {
  applyQueueScrollRelayAction,
  createQueueScrollRelayState,
  QUEUE_SCROLL_RELAY_ARRIVALS,
  QUEUE_SCROLL_RELAY_CAPACITY,
  type QueueScrollRelayAction,
  type QueueScrollRelayState,
} from './queueScrollRelay'
import './knowledgeScrollChallenge.css'

export function QueueKnowledgeScrollChallenge() {
  const challenge = useChallengeState()
  const [game, setGame] = useState<QueueScrollRelayState>(createQueueScrollRelayState)

  if (challenge.activeChallenge !== 'queue-knowledge-scroll') return null

  const run = (action: QueueScrollRelayAction) => {
    setGame((current) => applyQueueScrollRelayAction(current, action))
  }
  const rearIndex = game.size > 0
    ? (game.frontIndex + game.size - 1) % QUEUE_SCROLL_RELAY_CAPACITY
    : null
  const claim = () => {
    challengeStore.markKnowledgeScrollTrialComplete()
    challengeStore.closeChallenge(true)
  }

  return (
    <CampaignChallengeFrame
      npcLabel="FARMER • OPTIONAL KNOWLEDGE SCROLL"
      title="The Circular Supply Relay"
      ariaLabel="Queue Knowledge Scroll circular relay challenge"
      stageLabel="OPTIONAL SCROLL TRIAL"
      progressLabel={game.deliveredValues.length + ' / ' + QUEUE_SCROLL_RELAY_ARRIVALS.length + ' DELIVERED'}
      onClose={game.completed ? undefined : () => challengeStore.closeChallenge(false)}
      closeLabel="Leave Queue Knowledge Scroll trial"
      overlayClassName="knowledge-scroll-overlay queue-scroll-relay-overlay"
      panelClassName="knowledge-scroll-panel queue-scroll-relay-panel"
    >
      {game.completed ? (
        <section className="knowledge-scroll-success" data-testid="queue-scroll-success">
          <p className="array-challenge-eyebrow">QUEUE KNOWLEDGE SCROLL RESTORED</p>
          <h3>The circular relay is complete.</h3>
          <p>All seven parcels left in FIFO order. The ring wrapped, overflow was rejected, both ends were inspected, and underflow was safely confirmed.</p>
          <button type="button" className="array-challenge-primary" data-testid="queue-scroll-claim" onClick={claim}>
            Claim Queue Knowledge Scroll
          </button>
        </section>
      ) : (
        <>
          <section className="campaign-challenge-howto" data-testid="queue-scroll-how-to-play">
            <h3>HOW TO PLAY</h3>
            <p><strong>Goal:</strong> run seven parcels through a five-slot circular queue while proving FIFO order and safe boundary handling.</p>
            <ul>
              <li>Enqueue adds the next arrival at REAR. Dequeue removes only the FRONT item.</li>
              <li>Inspect reads FRONT or REAR without changing the queue.</li>
              <li>After the ring is full, demonstrate rejected overflow. After all deliveries, demonstrate underflow on the empty queue.</li>
            </ul>
            <p>Load four parcels, dispatch the first two, then load the final three so REAR wraps around. Inspect both ends before dispatching the remaining parcels.</p>
          </section>

          <div className="knowledge-scroll-status-row">
            <span>{game.nextArrivalIndex} / {QUEUE_SCROLL_RELAY_ARRIVALS.length} ARRIVED</span>
            <strong>{game.size} / {QUEUE_SCROLL_RELAY_CAPACITY} SLOTS USED</strong>
          </div>

          <section className="queue-scroll-arrivals" aria-label="Seven incoming parcel IDs">
            <strong>ARRIVAL ORDER</strong>
            <span>{QUEUE_SCROLL_RELAY_ARRIVALS.map((value, index) => (
              <span key={value} className={index < game.nextArrivalIndex ? 'is-loaded' : ''}>{value}</span>
            ))}</span>
          </section>

          <section className="queue-scroll-ring" aria-label="Five-slot circular queue">
            {game.slots.map((value, index) => (
              <div
                key={index}
                className={[
                  'queue-scroll-slot',
                  index === game.frontIndex && game.size > 0 ? 'is-front' : '',
                  index === rearIndex ? 'is-rear' : '',
                ].filter(Boolean).join(' ')}
                data-testid={'queue-scroll-slot-' + index}
              >
                <small>SLOT {index + 1}</small>
                <strong>{value === null ? 'Empty' : value}</strong>
                <span>
                  {index === game.frontIndex && game.size > 0 ? 'FRONT' : ''}
                  {index === rearIndex && game.size > 0 ? (index === game.frontIndex ? ' · REAR' : 'REAR') : ''}
                </span>
              </div>
            ))}
          </section>

          <div className="queue-scroll-actions">
            <button type="button" data-testid="queue-scroll-enqueue-next" disabled={game.nextArrivalIndex >= QUEUE_SCROLL_RELAY_ARRIVALS.length} onClick={() => run({ type: 'enqueue-next' })}>
              Enqueue next at REAR
            </button>
            <button type="button" data-testid="queue-scroll-dequeue-front" disabled={game.size === 0} onClick={() => run({ type: 'dequeue-front' })}>
              Dequeue FRONT
            </button>
            <button type="button" data-testid="queue-scroll-inspect-front" onClick={() => run({ type: 'inspect-front' })}>
              Inspect FRONT
            </button>
            <button type="button" data-testid="queue-scroll-inspect-rear" onClick={() => run({ type: 'inspect-rear' })}>
              Inspect REAR
            </button>
            <button type="button" data-testid="queue-scroll-overflow-proof" onClick={() => run({ type: 'probe-overflow' })}>
              Try enqueue 96 · Overflow
            </button>
            <button type="button" data-testid="queue-scroll-underflow-proof" onClick={() => run({ type: 'probe-underflow' })}>
              Dequeue empty · Underflow
            </button>
          </div>

          <div className="queue-scroll-proof-row" aria-label="Relay proof progress">
            <span className={game.overflowConfirmed ? 'is-done' : ''}>Overflow {game.overflowConfirmed ? 'confirmed' : 'pending'}</span>
            <span className={game.frontInspected && game.rearInspected ? 'is-done' : ''}>
              FRONT and REAR {game.frontInspected && game.rearInspected ? 'inspected' : 'pending'}
            </span>
            <span className={game.underflowConfirmed ? 'is-done' : ''}>Underflow {game.underflowConfirmed ? 'confirmed' : 'pending'}</span>
          </div>

          <div className="knowledge-scroll-guidance" role="status" aria-live="polite">
            {game.feedback?.message}
          </div>
          <div className="queue-scroll-delivered" aria-label="Delivered parcels">
            <strong>Delivered in FIFO order</strong>
            <span>{game.deliveredValues.length ? game.deliveredValues.join(' → ') : 'No parcels dispatched yet'}</span>
          </div>
        </>
      )}
    </CampaignChallengeFrame>
  )
}
