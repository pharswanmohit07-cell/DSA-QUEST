import { challengeStore, useChallengeState } from './challengeStore'
import {
  SAMURAI_GUIDED_STEPS,
  SAMURAI_SCROLLS,
  type SamuraiScrollId,
} from './samuraiStackChallenge'
import './samuraiStackChallenge.css'

function scrollLabel(scrollId: SamuraiScrollId): string {
  return SAMURAI_SCROLLS.find((scroll) => scroll.id === scrollId)?.label ?? scrollId
}

export function SamuraiStackDojoChallenge() {
  const challenge = useChallengeState()
  const progress = challenge.samuraiStackProgress
  if (challenge.activeChallenge !== 'samurai-stack-dojo' || !progress) return null

  const topIndex = progress.stack.length - 1
  const guidedComplete = progress.guidedStepIndex === SAMURAI_GUIDED_STEPS.length
  const guidedStep = SAMURAI_GUIDED_STEPS[progress.guidedStepIndex]
  const isFinal = progress.mode === 'final'
  const canClaim = isFinal && progress.completed

  const push = (scrollId: SamuraiScrollId) => challengeStore.executeSamuraiStackAction({ type: 'push', scrollId })
  const peek = () => challengeStore.executeSamuraiStackAction({ type: 'peek' })
  const pop = () => challengeStore.executeSamuraiStackAction({ type: 'pop' })

  return (
    <div className="array-challenge-overlay samurai-stack-overlay" role="dialog" aria-modal="true" aria-label="Samurai Dojo Scroll Tower">
      <section className="array-challenge-panel samurai-stack-panel samurai-dojo-panel">
        <header className="array-challenge-header">
          <div>
            <p className="array-challenge-eyebrow">SAMURAI • THE DOJO'S LOST SCROLLS</p>
            <h2>{canClaim ? 'The Lotus Scroll Is Yours' : 'Dojo Scroll Tower'}</h2>
          </div>
          {!canClaim && <button type="button" className="array-challenge-close" aria-label="Leave Dojo challenge" onClick={() => challengeStore.closeChallenge(false)}>×</button>}
        </header>

        <div className="samurai-stack-stage-line">
          <span>{progress.mode === 'guided' ? 'GUIDED MODE' : progress.mode === 'practice' ? 'PRACTICE MODE' : 'FINAL SCROLL TRIAL'}</span>
          <span>{progress.stack.length} {progress.stack.length === 1 ? 'SCROLL' : 'SCROLLS'} IN TOWER</span>
        </div>

        {canClaim ? (
          <section className="samurai-stack-complete" data-testid="samurai-stack-complete">
            <div className="samurai-stack-reward-scroll" aria-hidden="true">✦</div>
            <h3>Stack Operations mastered!</h3>
            <p>You recovered the Lotus Scroll, used Peek without changing the tower, and preserved the Phoenix Scroll beneath it.</p>
            <p className="samurai-stack-reward-line">STACK RELIC · +50 XP ON FIRST COMPLETION</p>
            <button type="button" className="array-challenge-primary" onClick={() => challengeStore.closeChallenge(true)} data-testid="samurai-stack-claim">Claim Stack Relic</button>
          </section>
        ) : (
          <>
            {progress.mode === 'guided' && guidedStep && (
              <section className="samurai-stack-objective">
                <span>GUIDED STEP {progress.guidedStepIndex + 1} OF {SAMURAI_GUIDED_STEPS.length}</span>
                <strong>{guidedStep.label}</strong>
              </section>
            )}
            {progress.mode === 'guided' && guidedComplete && (
              <section className="samurai-stack-objective is-ready">
                <span>GUIDED SEQUENCE COMPLETE</span>
                <strong>You have seen how the top changes after each operation. Try the moves freely in Practice Mode.</strong>
                <button type="button" className="array-challenge-primary" onClick={() => challengeStore.enterSamuraiStackPractice()} data-testid="samurai-stack-enter-practice">Enter Practice Mode</button>
              </section>
            )}
            {progress.mode === 'practice' && (
              <section className="samurai-stack-objective">
                <span>PRACTICE THE THREE OPERATIONS</span>
                <strong>Experiment with any scroll. Push adds to TOP, Peek reads TOP, and Pop removes TOP.</strong>
                <button type="button" className="array-challenge-primary" onClick={() => challengeStore.beginSamuraiStackFinalTrial()} data-testid="samurai-stack-begin-final">Begin Final Scroll Trial</button>
              </section>
            )}
            {isFinal && (
              <section className="samurai-stack-objective is-final">
                <span>FINAL OBJECTIVE</span>
                <strong>Recover the Lotus Scroll. Pop the two scrolls above it, Peek when Lotus reaches TOP, then Pop Lotus. Keep Phoenix at the bottom.</strong>
              </section>
            )}

            <div className="samurai-stack-workbench">
              <section className="samurai-stack-tower-card" aria-label="Scroll tower, bottom to top">
                <div className="samurai-stack-tower-header">
                  <strong>SCROLL TOWER</strong>
                  <span>TOP ↓</span>
                </div>
                {progress.stack.length === 0 ? (
                  <div className="samurai-stack-empty">The tower is empty. Push a scroll to begin.</div>
                ) : (
                  <ol className="samurai-stack-tower">
                    {progress.stack.map((scrollId, index) => (
                      <li key={scrollId + '-' + index} className={index === topIndex ? 'is-top' : ''} data-testid={'samurai-stack-slot-' + index}>
                        <span className="samurai-stack-scroll-glyph" aria-hidden="true">▤</span>
                        <span>{scrollLabel(scrollId)}</span>
                        <small>{index === topIndex ? 'TOP' : 'BELOW · ' + (index + 1)}</small>
                      </li>
                    ))}
                  </ol>
                )}
                <div className="samurai-stack-base">DOJO SCROLL STAND</div>
              </section>

              <section className="samurai-stack-controls-card">
                <strong>DOJO ACTIONS</strong>
                {progress.mode !== 'final' && (
                  <div className="samurai-stack-shelf">
                    <span>Choose a scroll to PUSH</span>
                    <div>
                      {SAMURAI_SCROLLS.filter((scroll) => progress.mode === 'guided'
                        ? scroll.id === 'river' || scroll.id === 'mountain'
                        : scroll.id === 'river' || scroll.id === 'mountain' || scroll.id === 'moon')
                        .map((scroll) => (
                          <button key={scroll.id} type="button" data-testid={'samurai-stack-push-' + scroll.id} onClick={() => push(scroll.id)} disabled={progress.mode === 'guided' && guidedComplete}>
                            + {scroll.label}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
                <div className="samurai-stack-action-row">
                  <button type="button" data-testid="samurai-stack-peek" onClick={peek} disabled={progress.stack.length === 0 || progress.mode === 'guided' && guidedComplete}>Peek at TOP</button>
                  <button type="button" className="is-pop" data-testid="samurai-stack-pop" onClick={pop} disabled={progress.stack.length === 0 || progress.mode === 'guided' && guidedComplete}>Pop TOP</button>
                </div>
                {progress.mode !== 'guided' && <button type="button" className="samurai-stack-hint" onClick={() => challengeStore.applySamuraiStackHint()}>Show hint</button>}
                <p className="samurai-stack-metrics">INVALID ACTIONS: {progress.invalidActions} · HINTS: {progress.hintsUsed}</p>
              </section>
            </div>

            {progress.feedback && (
              <div className={'samurai-stack-feedback ' + (progress.feedback.isError ? 'is-error' : 'is-success')} role="status" aria-live="polite">
                {progress.feedback.message}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
