import { CAMPAIGN_TOPICS } from './campaignDefinitions'
import { useQuestState } from './QuestManager'
import { useRelicCollection, type RelicReward } from './relicInventory'
import './relicJournal.css'

const REWARD_LABELS: Record<RelicReward, string> = {
  'fire-scroll': 'Fire Scroll',
  'ice-scroll': 'Ice Scroll',
  'plant-scroll': 'Plant Scroll',
  'rock-scroll': 'Rock Scroll',
  'thunder-scroll': 'Thunder Scroll',
  'gold-key': 'Gold Key',
  'silver-key': 'Silver Key',
}

export function RelicJournal({ onClose }: { onClose: () => void }) {
  const relics = useRelicCollection()
  const { campaign } = useQuestState()
  const claimedCount = relics.claimedGuardians.length

  return (
    <aside id="relic-journal" className="relic-journal" data-testid="relic-journal" aria-label="Relic collection journal">
      <header className="relic-journal-heading">
        <div>
          <p className="relic-journal-eyebrow">A village mystery</p>
          <h3>Hidden Relics</h3>
        </div>
        <div className="relic-journal-heading-actions">
          <span className="relic-journal-count" data-testid="relic-journal-count">
            {claimedCount} / {CAMPAIGN_TOPICS.length} found
          </span>
          <button type="button" className="quest-tracker-close" aria-label="Close relic journal" onClick={onClose}>×</button>
        </div>
      </header>

      <p className="relic-journal-story">
        {claimedCount === CAMPAIGN_TOPICS.length
          ? 'Every guardian has answered your call. The scrolls and keys are now in your keeping.'
          : relics.emptyScrollsClaimed
            ? 'Carry a blank scroll to a guardian whose lesson you have mastered. Each guardian guards a different secret.'
            : relics.questAccepted
              ? 'The Old Man has accepted your promise. Return to him to receive the blank scrolls before challenging any guardian.'
              : 'Speak with the Old Man and accept the hidden collection quest to begin.'}
      </p>

      {relics.emptyScrollsClaimed && (
        <div className="relic-journal-supply" data-testid="relic-journal-supply">
          <span>Blank scrolls remaining</span>
          <strong>{relics.emptyScrollsRemaining}</strong>
        </div>
      )}

      <ol className="relic-journal-list">
        {CAMPAIGN_TOPICS.map((topic, index) => {
          const reward = relics.claimedGuardians.includes(topic.id)
            ? relics.assignments[topic.id]
            : null
          const status = campaign.topics[topic.id]?.status ?? 'locked'
          return (
            <li
              className={`relic-journal-item${reward ? ' is-found' : ''}`}
              data-testid={`relic-guardian-${topic.id}`}
              key={topic.id}
            >
              <span className="relic-journal-number">{index + 1}</span>
              <span className="relic-journal-topic">
                <strong>{topic.displayName}</strong>
                <small>{status === 'completed' ? 'Lesson mastered' : status === 'locked' ? 'Guardian not yet reached' : 'Lesson in progress'}</small>
              </span>
              <span className="relic-journal-reward">
                {reward ? REWARD_LABELS[reward] : 'Undiscovered'}
              </span>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
