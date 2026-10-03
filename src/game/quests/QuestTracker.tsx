import { useState } from 'react'
import { useQuestState } from './QuestManager'
import type { QuestRecord } from './questTypes'
import './questTracker.css'

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
        className={`quest-tracker-toggle${activeQuest ? ' has-active-quest' : ''}`}
        data-testid="quest-tracker-toggle"
        type="button"
        aria-label={isOpen ? 'Close quest details' : 'Open quest details'}
        aria-expanded={isOpen}
        aria-controls="quest-details-panel"
        onClick={() => setIsOpen((open) => !open)}
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
