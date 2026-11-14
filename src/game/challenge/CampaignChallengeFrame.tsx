import type { ReactNode } from 'react'
import './campaignChallengeFrame.css'

export type CampaignChallengeFrameProps = {
  npcLabel: string
  title: string
  ariaLabel: string
  stageLabel: string
  progressLabel?: string
  onClose?: () => void
  closeLabel?: string
  closeTestId?: string
  headerActions?: ReactNode
  overlayClassName?: string
  panelClassName?: string
  children: ReactNode
  footer?: ReactNode
}

export function CampaignChallengeFrame({
  npcLabel,
  title,
  ariaLabel,
  stageLabel,
  progressLabel,
  onClose,
  closeLabel = 'Leave challenge',
  closeTestId,
  headerActions,
  overlayClassName = '',
  panelClassName = '',
  children,
  footer,
}: CampaignChallengeFrameProps) {
  return (
    <div
      className={['array-challenge-overlay', 'campaign-challenge-overlay', overlayClassName].filter(Boolean).join(' ')}
      data-testid="campaign-challenge-frame"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <section className={['array-challenge-panel', 'campaign-challenge-panel', panelClassName].filter(Boolean).join(' ')}>
        <header className="array-challenge-header campaign-challenge-header">
          <div>
            <p className="array-challenge-eyebrow">{npcLabel}</p>
            <h2>{title}</h2>
          </div>
          <div className="campaign-challenge-header-actions">
            {headerActions}
            {onClose && (
              <button
                type="button"
                className="array-challenge-close"
                data-testid={closeTestId}
                aria-label={closeLabel}
                onClick={onClose}
              >
                ×
              </button>
            )}
          </div>
        </header>

        <div className="campaign-challenge-stage-line">
          <span>{stageLabel}</span>
          {progressLabel && <span>{progressLabel}</span>}
        </div>

        <div className="campaign-challenge-content">{children}</div>
        {footer && <footer className="campaign-challenge-footer">{footer}</footer>}
      </section>
    </div>
  )
}
