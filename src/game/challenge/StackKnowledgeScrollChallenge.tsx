import { useState } from 'react'
import { CampaignChallengeFrame } from './CampaignChallengeFrame'
import { challengeStore, useChallengeState } from './challengeStore'
import {
  advanceStackScrollRescueRound,
  applyStackScrollRescueMove,
  createStackScrollRescueState,
  retryStackScrollRescueRound,
  type StackScrollRescueState,
  type StackTowerId,
} from './stackScrollRescue'
import './knowledgeScrollChallenge.css'

const TOWERS: readonly StackTowerId[] = ['A', 'B', 'C']

export function StackKnowledgeScrollChallenge() {
  const challenge = useChallengeState()
  const [game, setGame] = useState<StackScrollRescueState>(createStackScrollRescueState)
  const [selectedTower, setSelectedTower] = useState<StackTowerId | null>(null)

  if (challenge.activeChallenge !== 'stack-knowledge-scroll') return null

  const chooseTower = (tower: StackTowerId) => {
    if (game.completed || game.roundComplete || game.failed) return
    if (selectedTower === null) {
      setSelectedTower(tower)
      return
    }
    setGame((current) => applyStackScrollRescueMove(current, { from: selectedTower, to: tower }))
    setSelectedTower(null)
  }

  const close = () => challengeStore.closeChallenge(false)
  const claim = () => {
    challengeStore.markKnowledgeScrollTrialComplete()
    challengeStore.closeChallenge(true)
  }

  return (
    <CampaignChallengeFrame
      npcLabel="SAMURAI • OPTIONAL KNOWLEDGE SCROLL"
      title="The Three-Tower Scroll Rescue"
      ariaLabel="Stack Knowledge Scroll rescue challenge"
      stageLabel="OPTIONAL SCROLL TRIAL"
      progressLabel={'ROUND ' + (game.roundIndex + 1) + ' / 3'}
      onClose={game.completed ? undefined : close}
      closeLabel="Leave Stack Knowledge Scroll trial"
      overlayClassName="knowledge-scroll-overlay stack-scroll-rescue-overlay"
      panelClassName="knowledge-scroll-panel stack-scroll-rescue-panel"
    >
      {game.completed ? (
        <section className="knowledge-scroll-success" data-testid="stack-scroll-success">
          <p className="array-challenge-eyebrow">STACK KNOWLEDGE SCROLL RESTORED</p>
          <h3>All three towers are complete.</h3>
          <p>You moved every scroll using only legal top-of-stack moves and stayed within each round's move budget.</p>
          <button type="button" className="array-challenge-primary" data-testid="stack-scroll-claim" onClick={claim}>
            Claim Stack Knowledge Scroll
          </button>
        </section>
      ) : (
        <>
          <section className="campaign-challenge-howto" data-testid="stack-scroll-how-to-play">
            <h3>HOW TO PLAY</h3>
            <p><strong>Goal:</strong> move every scroll from tower A to tower C, then clear all three rounds.</p>
            <ul>
              <li>Select a tower to choose its <strong>TOP</strong> scroll, then select the destination tower.</li>
              <li>Move only the TOP scroll. A lower scroll cannot be taken through another scroll.</li>
              <li>Never place a larger scroll on a smaller one.</li>
            </ul>
            <p>Round sizes increase from 3 to 5 scrolls. Finish within the visible move budget. A failed round can be retried; the Scroll is earned only after all three rounds.</p>
          </section>

          <div className="knowledge-scroll-status-row">
            <span>ROUND {game.roundIndex + 1} · {game.scrollCount} SCROLLS</span>
            <strong>{game.moveCount} / {game.moveBudget} MOVES</strong>
          </div>

          <div className="stack-rescue-workbench" aria-label="Three scroll towers">
            {TOWERS.map((tower) => {
              const scrolls = game.towers[tower]
              return (
                <button
                  type="button"
                  key={tower}
                  className={'stack-rescue-tower' + (selectedTower === tower ? ' is-selected' : '')}
                  data-testid={'stack-rescue-tower-' + tower}
                  aria-label={'Select tower ' + tower + (selectedTower ? ' as destination' : ' as source')}
                  aria-pressed={selectedTower === tower}
                  onClick={() => chooseTower(tower)}
                >
                  <span className="stack-rescue-tower-title">TOWER {tower}</span>
                  <span className="stack-rescue-post" aria-hidden="true">
                    {scrolls.length === 0 ? (
                      <span className="stack-rescue-empty">Empty</span>
                    ) : (
                      scrolls.map((size, index) => (
                        <span
                          key={size}
                          className={'stack-rescue-scroll' + (index === scrolls.length - 1 ? ' is-top' : '')}
                          style={{ width: (46 + size * 17) + 'px' }}
                          data-testid={'stack-rescue-scroll-' + tower + '-' + size}
                        >
                          {index === scrolls.length - 1 ? 'TOP · ' : ''}Scroll {size}
                        </span>
                      ))
                    )}
                  </span>
                  <span className="stack-rescue-base" aria-hidden="true" />
                  <span className="stack-rescue-tower-action">
                    {selectedTower === null ? 'Choose as source' : selectedTower === tower ? 'Selected' : 'Move TOP here'}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="knowledge-scroll-guidance" role="status" aria-live="polite">
            {selectedTower
              ? 'Tower ' + selectedTower + ' selected. Choose a destination tower.'
              : 'Select a source tower to begin a move.'}
            {game.feedback && <p className={game.feedback.isError ? 'is-error' : 'is-success'}>{game.feedback.message}</p>}
          </div>

          {game.roundComplete && !game.completed && (
            <section className="knowledge-scroll-success" data-testid="stack-scroll-round-complete">
              <h3>Round {game.roundIndex + 1} cleared.</h3>
              <p>The next tower contains more scrolls and a larger move budget.</p>
              <button type="button" className="array-challenge-primary" data-testid="stack-scroll-next-round" onClick={() => {
                setGame((current) => advanceStackScrollRescueRound(current))
                setSelectedTower(null)
              }}>
                Continue to round {game.roundIndex + 2}
              </button>
            </section>
          )}

          {game.failed && (
            <section className="knowledge-scroll-failed" data-testid="stack-scroll-round-failed">
              <h3>Move budget used.</h3>
              <p>This round is not cleared. Retry the same tower to try again.</p>
              <button type="button" className="array-challenge-primary" data-testid="stack-scroll-retry-round" onClick={() => {
                setGame((current) => retryStackScrollRescueRound(current))
                setSelectedTower(null)
              }}>
                Retry round
              </button>
            </section>
          )}
        </>
      )}
    </CampaignChallengeFrame>
  )
}
