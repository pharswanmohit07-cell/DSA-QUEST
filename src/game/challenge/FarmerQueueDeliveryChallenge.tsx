import { CampaignChallengeFrame } from './CampaignChallengeFrame'
import { challengeStore, useChallengeState } from './challengeStore'
import { getQueueDeliveryParcel, QUEUE_DELIVERY_MANIFEST } from './queueChallenge'
import './arrayChallenge.css'
import './queueChallenge.css'
import './farmerQueueChallenge.css'

export function FarmerQueueDeliveryChallenge() {
  const challenge = useChallengeState()
  if (challenge.activeChallenge !== 'farmer-queue-delivery') return null

  const delivered = new Set(challenge.deliveredQueueValues)
  const waiting = new Set(challenge.currentQueue)
  const front = challenge.currentQueue[0]
  const rear = challenge.currentQueue[challenge.currentQueue.length - 1]
  const nextParcel = QUEUE_DELIVERY_MANIFEST[challenge.deliveryLoadedCount]

  return (
    <CampaignChallengeFrame
      npcLabel="FARMER • INDEPENDENT DELIVERY ROUND"
      title="Dispatch the Village Supplies"
      ariaLabel="Farmer independent village delivery challenge"
      stageLabel="IMPLEMENT"
      progressLabel={challenge.deliveredQueueValues.length + ' / ' + QUEUE_DELIVERY_MANIFEST.length + ' DELIVERED'}
      onClose={challenge.isComplete ? undefined : () => challengeStore.closeChallenge(false)}
      closeLabel="Leave delivery challenge"
      closeTestId="farmer-queue-delivery-close"
      overlayClassName="queue-challenge-overlay farmer-queue-delivery-overlay"
      panelClassName="queue-challenge-panel farmer-queue-delivery-panel"
    >
      <section className="campaign-challenge-howto" data-testid="farmer-delivery-how-to-play">
        <h3>HOW TO PLAY</h3>
        <p><strong>Goal:</strong> deliver all five parcels in the order they arrive.</p>
        <ul>
          <li><strong>Enqueue at REAR:</strong> load the next parcel at the back of the line.</li>
          <li><strong>Inspect FRONT / REAR:</strong> read either end without removing a parcel.</li>
          <li><strong>Dequeue FRONT:</strong> dispatch only the oldest parcel. The line has four spaces, so watch for overflow.</li>
        </ul>
        <p>Success means every parcel is delivered from FRONT in FIFO order and the queue is empty.</p>
      </section>
        <p className="array-challenge-description">
          The tutorial is over. Run this route yourself: load each new parcel at the <strong>REAR</strong>,
          inspect either end without removing anything, and dispatch only from the <strong>FRONT</strong>.
          The four-slot line must keep its FIFO order.
        </p>

        <section className="queue-challenge-route" aria-label="Village delivery manifest" data-testid="farmer-delivery-manifest">
          <div className="queue-challenge-route-heading">
            <div>
              <p className="array-challenge-eyebrow">DELIVERY MANIFEST</p>
              <h3>Five village drop-offs</h3>
            </div>
            <strong data-testid="farmer-delivery-progress">{challenge.deliveredQueueValues.length} / {QUEUE_DELIVERY_MANIFEST.length} DELIVERED</strong>
          </div>
          <ol className="queue-challenge-route-list">
            {QUEUE_DELIVERY_MANIFEST.map((parcel, index) => {
              const isDelivered = delivered.has(parcel.value)
              const isFront = front === parcel.value
              const isWaiting = waiting.has(parcel.value)
              const isNext = index === challenge.deliveryLoadedCount
              const status = isDelivered ? 'DELIVERED' : isFront ? 'NEXT · FRONT' : isWaiting ? 'WAITING IN QUEUE' : isNext ? 'NEXT ARRIVAL' : 'AWAITING LOAD'
              return (
                <li key={parcel.value} className={[isDelivered ? 'is-delivered' : '', isFront ? 'is-next' : '', isWaiting && !isFront ? 'is-waiting' : ''].filter(Boolean).join(' ')} data-testid={'farmer-delivery-parcel-' + parcel.value}>
                  <span className="queue-challenge-route-number">{String(index + 1).padStart(2, '0')}</span>
                  <span className="queue-challenge-route-copy">
                    <strong>{parcel.cargo}</strong>
                    <small>{parcel.destination}</small>
                    <em>{status}</em>
                  </span>
                </li>
              )
            })}
          </ol>
        </section>

        <section className="queue-challenge-board farmer-queue-live-board" aria-label="Live FIFO queue">
          <div className="queue-challenge-board-heading">
            <strong>SUPPLY LINE</strong>
            <span>{challenge.currentQueue.length} / {challenge.queueCapacity} SLOTS USED</span>
          </div>
          <div className="farmer-queue-live-slots">
            {challenge.currentQueue.length === 0 ? (
              <p className="queue-challenge-empty">The line is empty. Load the first arrival at the rear.</p>
            ) : challenge.currentQueue.map((value, index) => {
              const parcel = getQueueDeliveryParcel(value)
              return (
                <div className={'farmer-queue-live-parcel' + (index === 0 ? ' is-front' : '')} key={value} data-testid={'farmer-live-queue-' + value}>
                  <small>{index === 0 ? 'FRONT · NEXT' : index === challenge.currentQueue.length - 1 ? 'REAR · NEWEST' : 'WAITING'}</small>
                  <strong>{parcel?.cargo ?? value}</strong>
                  <span>{parcel?.destination ?? ('Parcel ' + value)}</span>
                </div>
              )
            })}
          </div>
          <div className="queue-challenge-ends">
            <p>Front <strong>{front ?? '—'}</strong></p>
            <p>Rear <strong>{rear ?? '—'}</strong></p>
          </div>
        </section>

        <section className="array-challenge-controls queue-challenge-controls farmer-queue-delivery-controls" aria-label="Independent queue operations">
          <div className="farmer-queue-delivery-next">
            <div>
              <p className="array-challenge-eyebrow">NEXT ARRIVAL</p>
              <strong>{nextParcel ? nextParcel.cargo : 'All parcels loaded'}</strong>
              <span>{nextParcel ? nextParcel.destination : 'Dispatch the remaining queue'}</span>
            </div>
            <button type="button" data-testid="farmer-delivery-load-next" disabled={!nextParcel} onClick={() => challengeStore.loadNextFarmerDeliveryParcel()}>Enqueue at REAR</button>
          </div>
          <div className="queue-challenge-peek-row">
            <button type="button" data-testid="farmer-delivery-inspect-front" onClick={() => challengeStore.inspectFarmerDeliveryFront()}>Inspect FRONT</button>
            <button type="button" data-testid="farmer-delivery-inspect-rear" onClick={() => challengeStore.inspectFarmerDeliveryRear()}>Inspect REAR</button>
          </div>
          <button type="button" className="array-challenge-pop" data-testid="farmer-delivery-dispatch-front" onClick={() => challengeStore.dispatchFarmerDeliveryFront()}>
            Dequeue FRONT · Dispatch parcel
          </button>
        </section>

        {challenge.feedback && (
          <p className={'array-challenge-feedback' + (challenge.feedback.isError ? ' is-error' : ' is-success')} role="status" data-testid="farmer-delivery-feedback">
            {challenge.feedback.message}
          </p>
        )}

        {challenge.isComplete && (
          <div className="array-challenge-success farmer-queue-delivery-success" data-testid="farmer-delivery-success">
            <div>
              <p className="array-challenge-eyebrow">VILLAGE ROUTE RESTORED</p>
              <h3>All five parcels delivered!</h3>
              <p>The independent dispatch run is complete. Every parcel left the FRONT in FIFO order.</p>
            </div>
            <button type="button" data-testid="farmer-queue-delivery-complete" onClick={() => challengeStore.closeChallenge(true)}>Complete Queue mastery</button>
          </div>
        )}
    </CampaignChallengeFrame>
  )
}
