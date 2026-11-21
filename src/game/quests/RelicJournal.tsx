import fireScrollImage from '../../assets/items/relics/ScrollFire.png'
import iceScrollImage from '../../assets/items/relics/ScrollIce.png'
import plantScrollImage from '../../assets/items/relics/ScrollPlant.png'
import rockScrollImage from '../../assets/items/relics/ScrollRock.png'
import thunderScrollImage from '../../assets/items/relics/ScrollThunder.png'
import goldKeyImage from '../../assets/items/relics/GoldKey.png'
import silverKeyImage from '../../assets/items/relics/SilverKey.png'
import emptyScrollImage from '../../assets/items/relics/ScrollEmpty.png'
import { CAMPAIGN_TOPICS } from './campaignDefinitions'
import type { CampaignTopicId } from './questTypes'
import { useQuestState } from './QuestManager'
import { useRelicCollection, type RelicReward } from './relicInventory'
import './relicJournal.css'

const REWARD_IMAGES: Record<RelicReward, string> = {
  'fire-scroll': fireScrollImage,
  'ice-scroll': iceScrollImage,
  'plant-scroll': plantScrollImage,
  'rock-scroll': rockScrollImage,
  'thunder-scroll': thunderScrollImage,
  'gold-key': goldKeyImage,
  'silver-key': silverKeyImage,
}

const REWARD_LABELS: Record<RelicReward, string> = {
  'fire-scroll': 'Fire Scroll',
  'ice-scroll': 'Ice Scroll',
  'plant-scroll': 'Plant Scroll',
  'rock-scroll': 'Rock Scroll',
  'thunder-scroll': 'Thunder Scroll',
  'gold-key': 'Gold Key',
  'silver-key': 'Silver Key',
}

const GUARDIAN_NAMES: Record<CampaignTopicId, string> = {
  arrays: 'Village Guide',
  'stack-operations': 'Samurai',
  queues: 'Farmer',
  'linked-lists': 'Monk',
  searching: 'Merchant',
  sorting: 'Red Ninja',
  trees: 'Shaman',
}

export function RelicJournal({ onClose }: { onClose: () => void }) {
  const relics = useRelicCollection()
  const { campaign } = useQuestState()
  const claimedCount = relics.claimedGuardians.length
  const nextMasteryTopic = CAMPAIGN_TOPICS.find(
    (topic) => campaign.topics[topic.id]?.status !== 'completed',
  )
  const masteredUnclaimedTopic = CAMPAIGN_TOPICS.find(
    (topic) =>
      campaign.topics[topic.id]?.status === 'completed' &&
      !relics.claimedGuardians.includes(topic.id),
  )
  const activeTrialTopic = relics.activeTrial
    ? CAMPAIGN_TOPICS.find((topic) => topic.id === relics.activeTrial)
    : undefined

  const journeyStage = relics.relicsReturned
    ? 'complete'
    : claimedCount === CAMPAIGN_TOPICS.length
      ? 'return-to-elder'
      : !relics.questAccepted
        ? 'meet-elder'
        : !relics.emptyScrollsClaimed
          ? 'collect-empty-scroll'
          : activeTrialTopic
            ? 'trial-active'
            : masteredUnclaimedTopic
              ? 'revisit-guardian'
              : 'master-lesson'

  const journeyObjective = journeyStage === 'complete'
    ? {
        status: 'Journey complete',
        title: 'The village is protected once more.',
        copy: 'You have returned every relic to the Old Man. The hidden collection journey is complete.',
      }
    : journeyStage === 'return-to-elder'
      ? {
          status: 'Final handover',
          title: 'Return to the Old Man.',
          copy: 'Every guardian relic has been recovered. Speak with the Old Man and entrust the completed collection to the village.',
        }
      : journeyStage === 'meet-elder'
        ? {
            status: 'Not started',
            title: 'Find the Old Man after opening the village gate.',
            copy: 'The Old Man will explain the threat to the village, give you an empty scroll, and entrust you with the relic journey.',
          }
        : journeyStage === 'collect-empty-scroll'
          ? {
              status: 'Waiting for the scroll',
              title: 'Return to the Old Man.',
              copy: 'Speak with him again to receive the empty scroll. You will need it when a guardian accepts your Knowledge Trial.',
            }
          : journeyStage === 'trial-active' && activeTrialTopic
            ? {
                status: 'Knowledge Trial in progress',
                title: `${GUARDIAN_NAMES[activeTrialTopic.id]} — ${activeTrialTopic.displayName}`,
                copy: 'Complete this guardian’s Knowledge Trial. After you succeed, present your empty scroll to receive the relic they protect.',
              }
            : journeyStage === 'revisit-guardian' && masteredUnclaimedTopic
              ? {
                  status: 'Guardian ready',
                  title: `Return to the ${GUARDIAN_NAMES[masteredUnclaimedTopic.id]}.`,
                  copy: 'You have mastered their main lesson. Speak with this guardian again, accept the Knowledge Trial, and complete it before offering your empty scroll for their relic.',
                }
              : {
                  status: 'Master a guardian lesson',
                  title: nextMasteryTopic
                    ? `Continue with the ${GUARDIAN_NAMES[nextMasteryTopic.id]} — ${nextMasteryTopic.displayName}.`
                    : 'Continue your guardian journey.',
                  copy: 'Complete the guardian’s main lesson first. Then return and speak with them again to accept the separate Knowledge Trial. A blank scroll is only offered after you pass.',
                }

  return (
    <aside id="relic-journal" className="relic-journal" data-testid="relic-journal" aria-label="Relic Journey">
      <header className="relic-journal-heading">
        <div>
          <p className="relic-journal-eyebrow">A village mystery</p>
          <h3>Relic Journey</h3>
        </div>
        <div className="relic-journal-heading-actions">
          <span className="relic-journal-count" data-testid="relic-journal-count">
            {claimedCount} / {CAMPAIGN_TOPICS.length} found
          </span>
          <button type="button" className="quest-tracker-close" aria-label="Close Relic Journey" onClick={onClose}>×</button>
        </div>
      </header>

      <section
        className={`relic-journey-objective is-${journeyStage}`}
        data-testid="relic-journey-objective"
        data-stage={journeyStage}
        aria-live="polite"
      >
        <p className="relic-journey-status">{journeyObjective.status}</p>
        <h4>{journeyObjective.title}</h4>
        <p className="relic-journal-story">{journeyObjective.copy}</p>
      </section>

      {relics.emptyScrollsClaimed && (
        <div className="relic-journal-supply" data-testid="relic-journal-supply">
          <span className="relic-journal-empty-scroll">
            <img src={emptyScrollImage} alt="" aria-hidden="true" />
            Blank scrolls remaining
          </span>
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
                {reward ? (
                  <>
                    <img src={REWARD_IMAGES[reward]} alt="" aria-hidden="true" />
                    <span>{REWARD_LABELS[reward]}</span>
                  </>
                ) : 'Undiscovered'}
              </span>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
