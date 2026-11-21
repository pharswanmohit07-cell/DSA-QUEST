import emptyScrollImage from '../../assets/items/relics/ScrollEmpty.png'
import './emptyScrollReward.css'

export function EmptyScrollRewardReveal({
  count,
  onContinue,
}: {
  count: number
  onContinue: () => void
}) {
  const safeCount = Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 7

  return (
    <div
      className="empty-scroll-reward-overlay"
      data-testid="empty-scroll-reward"
      role="dialog"
      aria-modal="true"
      aria-labelledby="empty-scroll-reward-title"
      onKeyDownCapture={(event) => {
        // Keep the dialogue underneath from advancing while this reward screen owns input.
        event.stopPropagation()
        if (event.key === 'Enter' || event.key === ' ') {
          const target = event.target
          if (target === event.currentTarget) {
            event.preventDefault()
            onContinue()
          }
        }
      }}
    >
      <section className="empty-scroll-reward-card">
        <p className="empty-scroll-reward-eyebrow">Village collection supplies</p>
        <h2 id="empty-scroll-reward-title">EMPTY SCROLLS OBTAINED</h2>
        <div className="empty-scroll-reward-stage" aria-hidden="false">
          <span className="empty-scroll-reward-aura" />
          <span className="empty-scroll-reward-ring" />
          <img
            className="empty-scroll-reward-art"
            src={emptyScrollImage}
            alt="Empty scroll"
            draggable={false}
          />
          <span className="empty-scroll-reward-count">×{safeCount}</span>
        </div>
        <p className="empty-scroll-reward-copy">
          You received seven blank scrolls. Offer one after mastering a guardian’s lesson to earn one of five elemental scrolls or one of two ancient keys.
        </p>
        <button
          type="button"
          className="empty-scroll-reward-continue"
          onClick={onContinue}
          autoFocus
        >
          Continue
        </button>
      </section>
    </div>
  )
}
