import { useEffect, useRef, useState } from 'react'
import { useQuestState } from './QuestManager'
import type { QuestRecord } from './questTypes'
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
  const { quests, activeQuest, xp } = useQuestState()
  const [isOpen, setIsOpen] = useState(false)
  const [hasNewQuest, setHasNewQuest] = useState(() => {
    try {
      return localStorage.getItem(UNREAD_QUEST_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })
  const previousActiveQuestId = useRef(activeQuest?.id ?? null)

  useEffect(() => {
    const style = document.createElement('style')
    style.setAttribute('data-dsa-quest-glow', 'true')
    style.textContent = QUEST_NEW_GLOW_CSS
    document.head.appendChild(style)
    return () => style.remove()
  }, [])

  useEffect(() => {
    const previousId = previousActiveQuestId.current
    const nextId = activeQuest?.id ?? null
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
  }, [activeQuest?.id])

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
  if (!activeQuest && quests.every((quest) => quest.status === 'locked')) {
    return null
  }
  const currentQuest =
    activeQuest ?? [...quests].reverse().find((quest) => quest.status === 'completed') ?? quests[0]
  const completedCount = quests.filter((quest) => quest.status === 'completed').length
  const progressCount = activeQuest
    ? quests.indexOf(activeQuest)
    : completedCount
  const progress = `${Math.min(progressCount + (activeQuest ? 1 : 0), quests.length)} / ${quests.length}`

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
                  style={{ width: `${(completedCount / quests.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
          <div className="quest-tracker-footer">
            <span>{quests.filter((quest: QuestRecord) => quest.status === 'completed').length} completed</span>
            <span className="quest-tracker-xp" data-testid="player-xp">{xp} XP</span>
          </div>
        </aside>
      )}
    </div>
  )
}
