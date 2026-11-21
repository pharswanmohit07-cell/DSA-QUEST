import emptyScrollImage from '../../assets/items/relics/ScrollEmpty.png'
import './emptyScrollReward.css'

export function EmptyScrollRewardReveal({
  onContinue,
}: {
  onContinue: () => void
}) {

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
        <h2 id="empty-scroll-reward-title">EMPTY SCROLL OBTAINED</h2>
        <div className="empty-scroll-reward-stage" aria-hidden="false">
          <span className="empty-scroll-reward-aura" />
          <span className="empty-scroll-reward-ring" />
          <img
            className="empty-scroll-reward-art"
            src={emptyScrollImage}
            alt="Empty scroll"
            draggable={false}
          />
        </div>
        <p className="empty-scroll-reward-copy">
          An empty scroll has been entrusted to you. Master a guardian’s lesson, then present the scroll to receive the relic they protect.
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
