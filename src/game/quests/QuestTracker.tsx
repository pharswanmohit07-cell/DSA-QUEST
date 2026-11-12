import { useEffect, useRef, useState } from 'react'
import { useQuestState } from './QuestManager'
import type { QuestRecord } from './questTypes'
import { ARRAYS_CAMPAIGN_STAGE_EVENT, getArraysCampaignStage } from './arraysCampaignStages'
import { hasKnowledgeScroll } from './knowledgeScrolls'
import './questTracker.css'

const UNREAD_QUEST_STORAGE_KEY = 'dsa-quest-unread-v1'

const QUEST_NEW_GLOW_CSS = `
.quest-tracker-toggle.has-new-quest {
  position: relative;
  animation: quest-new-quest-pulse 1.2s ease-in-out infinite;
}
.quest-tracker-toggle.has-new-quest::after {
  content: '';
  position: absolute;
  top: -3px;
  right: -3px;
  width: 8px;
  height: 8px;
  border: 2px solid #f4e8ce;
  border-radius: 50%;
  background: #d84a2b;
}
@keyframes quest-new-quest-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 2px 0 #54391f, 0 0 5px rgba(245, 158, 11, 0.35);
  }
  50% {
    transform: scale(1.08);
    box-shadow: 0 2px 0 #54391f, 0 0 18px 5px rgba(251, 191, 36, 0.72);
  }
}
@media (prefers-reduced-motion: reduce) {
  .quest-tracker-toggle.has-new-quest {
    animation: none;
    box-shadow: 0 2px 0 #54391f, 0 0 12px 3px rgba(251, 191, 36, 0.62);
  }
}
`

const STATUS_LABEL: Record<QuestRecord['status'], string> = {
  locked: 'Locked',
  active: 'Active',
  completed: 'Done',
  failed: 'Failed',
}

/** Quest details stay hidden behind a compact HUD button until requested. */
export function QuestTracker() {
  const { quests, activeQuest, xp, northernSnowfieldScouting, villageTrainingRoute, campaign } = useQuestState()
  const [isOpen, setIsOpen] = useState(false)
  const [arraysStageRevision, setArraysStageRevision] = useState(0)
  useEffect(() => {
    const refreshStage = () => setArraysStageRevision((revision) => revision + 1)
    window.addEventListener(ARRAYS_CAMPAIGN_STAGE_EVENT, refreshStage)
    return () => window.removeEventListener(ARRAYS_CAMPAIGN_STAGE_EVENT, refreshStage)
  }, [])
  void arraysStageRevision
  const oldManGateComplete = quests.some((quest) =>
    quest.id === 'array-sorting-challenge' && quest.status === 'completed',
  )
  const arraysStatus = campaign.topics.arrays.status
  const showArraysQuest = oldManGateComplete && arraysStatus !== 'locked'
  const arraysStage = getArraysCampaignStage()
  const [hasNewQuest, setHasNewQuest] = useState(() => {
    try {
      return localStorage.getItem(UNREAD_QUEST_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })
  const trackerActiveQuestId = showArraysQuest && arraysStatus !== 'completed'
    ? 'arrays-1-village-guide'
    : activeQuest?.id ?? null
  const previousActiveQuestId = useRef(trackerActiveQuestId)

  useEffect(() => {
    const style = document.createElement('style')
    style.setAttribute('data-dsa-quest-glow', 'true')
    style.textContent = QUEST_NEW_GLOW_CSS
    document.head.appendChild(style)
    return () => style.remove()
  }, [])

  useEffect(() => {
    const previousId = previousActiveQuestId.current
    const nextId = trackerActiveQuestId
    previousActiveQuestId.current = nextId

    // Do not treat the seeded first quest as unread. Only an actual transition
    // to a different active quest is a newly unlocked quest.
    if (previousId && nextId && previousId !== nextId) {
      setHasNewQuest(true)
      try {
        localStorage.setItem(UNREAD_QUEST_STORAGE_KEY, 'true')
      } catch {
        // Unread state still works for the current session if storage is unavailable.
      }
    }
  }, [trackerActiveQuestId])

  const handleToggle = () => {
    setIsOpen((open) => {
      const nextOpen = !open
      if (nextOpen) {
        setHasNewQuest(false)
        try {
          localStorage.setItem(UNREAD_QUEST_STORAGE_KEY, 'false')
        } catch {
          // Ignore unavailable storage.
        }
      }
      return nextOpen
    })
  }
  if (!activeQuest && !showArraysQuest && quests.every((quest) => quest.status === 'locked')) {
    return null
  }
  const currentQuest = showArraysQuest
    ? {
        id: 'arrays-1-village-guide',
        title: 'Arrays 1 — The Village Guide',
        status: arraysStatus === 'completed' ? 'completed' as const : 'active' as const,
        objective: arraysStatus === 'completed'
          ? hasKnowledgeScroll('arrays')
            ? 'Arrays mastered and the Knowledge Scroll collected.'
            : 'Arrays mastered. Speak to the Village Guide again for the optional Knowledge Scroll.'
          : arraysStage === 'learn'
            ? 'Speak to the Village Guide and learn the foundations of arrays.'
            : arraysStage === 'practice'
              ? 'Complete the three guided Arrays practice questions.'
              : 'Complete the interactive Array Manipulation Workshop.',
        description: 'Learn, practise, and implement array operations with the Village Guide.',
        requires: [],
      }
    : activeQuest ?? [...quests].reverse().find((quest) => quest.status === 'completed') ?? quests[0]
  const completedCount = quests.filter((quest) => quest.status === 'completed').length
  const completedPrimaryCount = completedCount +
    Number(showArraysQuest && arraysStatus === 'completed')
  const progressCount = activeQuest
    ? quests.indexOf(activeQuest)
    : completedCount
  const progress = showArraysQuest
    ? `${arraysStatus === 'completed' ? 3 : 2} / 3`
    : `${Math.min(progressCount + (activeQuest ? 1 : 0), quests.length)} / ${quests.length}`
  const progressPercent = showArraysQuest
    ? (completedPrimaryCount / 3) * 100
    : (completedCount / quests.length) * 100

  return (
    <div className="quest-tracker" data-testid="quest-tracker">
      <button
        className={`quest-tracker-toggle${activeQuest ? ' has-active-quest' : ''}${hasNewQuest ? ' has-new-quest' : ''}`}
        data-testid="quest-tracker-toggle"
        type="button"
        aria-label={isOpen ? 'Close quest details' : 'Open quest details'}
        aria-expanded={isOpen}
        aria-controls="quest-details-panel"
        onClick={handleToggle}
      >
        !
      </button>
      {isOpen && (
        <aside
          className="quest-details-panel"
          id="quest-details-panel"
          data-testid="quest-details-panel"
          aria-label="Quest details"
        >
          <div className="quest-tracker-heading">
            <h2 className="quest-tracker-title">Current Quest</h2>
            <button
              className="quest-tracker-close"
              type="button"
              aria-label="Close quest details"
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
          </div>
          <div
            className={`quest-row is-${currentQuest.status}`}
            data-testid={`quest-${currentQuest.id}`}
            data-status={currentQuest.status}
          >
            <div className="quest-row-head">
              <span className="quest-row-name">{currentQuest.title}</span>
              <span className="quest-row-status">{STATUS_LABEL[currentQuest.status]}</span>
            </div>
            <p className="quest-row-objective">{currentQuest.objective}</p>
            <p className="quest-row-description">{currentQuest.description}</p>
            <div className="quest-progress" aria-label={`Quest progress ${progress}`}>
              <div className="quest-progress-label">
                <span>Quest progress</span>
                <span>{progress}</span>
              </div>
              <div className="quest-progress-track">
                <div
                  className="quest-progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
          {northernSnowfieldScouting.status !== 'not-started' && (
            <section
              className="optional-side-quest"
              data-testid="northern-snowfield-quest"
              data-status={northernSnowfieldScouting.status}
              aria-label="Optional Side Quest"
            >
              <h3 className="optional-side-quest-title">Optional Side Quest</h3>
              <div className={`optional-side-quest-row is-${northernSnowfieldScouting.status}`}>
                <div className="quest-row-head">
                  <span className="quest-row-name">Northern Scouting Trip</span>
                  <span className="quest-row-status">
                    {northernSnowfieldScouting.status === 'completed'
                      ? 'Done'
                      : northernSnowfieldScouting.snowfieldVisited
                        ? 'Report'
                        : 'Active'}
                  </span>
                </div>
                <p className="quest-row-objective">
                  {northernSnowfieldScouting.status === 'completed'
                    ? 'Visit northern snowfield — completed.'
                    : northernSnowfieldScouting.snowfieldVisited
                      ? 'Snowfield visit — complete.'
                      : 'Visit the northern snowfield beyond the torii.'}
                </p>
                {(northernSnowfieldScouting.status === 'completed' ||
                  northernSnowfieldScouting.snowfieldVisited) && (
                  <p className="quest-row-objective">
                    {northernSnowfieldScouting.status === 'completed'
                      ? 'Report to Elder — completed.'
                      : 'Return to the Elder and report.'}
                  </p>
                )}
                {northernSnowfieldScouting.rewardClaimed && (
                  <p className="optional-side-quest-reward">25 XP claimed.</p>
                )}
              </div>
            </section>
          )}
          {villageTrainingRoute.status !== 'not-started' && (
            <section
              className="optional-side-quest"
              data-testid="village-training-route-quest"
              data-status={villageTrainingRoute.status}
              aria-label="Optional Side Quest"
            >
              <h3 className="optional-side-quest-title">Optional Side Quest</h3>
              <div className={`optional-side-quest-row is-${villageTrainingRoute.status}`}>
                <div className="quest-row-head">
                  <span className="quest-row-name">Village Training Route</span>
                  <span className="quest-row-status">
                    {villageTrainingRoute.status === 'completed'
                      ? 'Done'
                      : villageTrainingRoute.stage === 'return-guide'
                        ? 'Report'
                        : 'Active'}
                  </span>
                </div>
                <p className="quest-row-objective">
                  {villageTrainingRoute.status === 'completed'
                    ? 'Village Training Route — completed.'
                    : villageTrainingRoute.stage === 'visit-monk'
                      ? 'Visit the Monk for guidance.'
                      : villageTrainingRoute.stage === 'visit-samurai'
                        ? 'Take the Samurai\'s trial at the dojo.'
                        : 'Return to the Village Guide and report.'}
                </p>
                {villageTrainingRoute.rewardClaimed && (
                  <p className="optional-side-quest-reward">25 XP claimed.</p>
                )}
              </div>
            </section>
          )}
          <div className="quest-tracker-footer">
            <span>{completedPrimaryCount} completed</span>
            <span className="quest-tracker-xp" data-testid="player-xp">{xp} XP</span>
          </div>
        </aside>
      )}
    </div>
  )
}
