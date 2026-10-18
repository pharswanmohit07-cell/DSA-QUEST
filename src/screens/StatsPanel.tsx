import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react'
import hunterIdleUrl from '../assets/tiles/ninja-village/Hunter/SeparateAnim/Idle.png'
import {
  getPlayerProfile,
  getStatsSnapshot,
  setPlayerName,
} from '../game/stats/playerStats'
import type { PlayerStats, TopicProgress, TopicStatus } from '../game/stats/playerStats'
import './statsPanel.css'

type StatsPanelProps = {
  onClose: () => void
}

function topicLabel(status: TopicStatus): string {
  switch (status) {
    case 'done':
      return 'DONE'
    case 'in-progress':
      return 'IN PROGRESS'
    case 'not-started':
      return 'NOT STARTED'
    case 'coming-soon':
      return 'COMING SOON'
  }
}

function topicWidth(status: TopicStatus): number {
  if (status === 'done') return 100
  if (status === 'in-progress') return 50
  return 0
}

function TopicRow({ topic }: { topic: TopicProgress }) {
  const label = topicLabel(topic.status)
  return (
    <div className={`stats-topic-row ${topic.status === 'coming-soon' ? 'is-coming-soon' : ''}`}>
      <span className="stats-topic-name">{topic.name}</span>
      <div
        className="stats-topic-meter"
        role="progressbar"
        aria-label={`${topic.name} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={topicWidth(topic.status)}
        aria-valuetext={label}
      >
        <span style={{ width: `${topicWidth(topic.status)}%` }} />
      </div>
      <span className={`stats-topic-status status-${topic.status}`}>{label}</span>
    </div>
  )
}

function FutureStatCard({ label, value }: { label: string; value: string | undefined }) {
  const comingSoon = value === undefined
  return (
    <div className="stats-future-stat" aria-label={`${label}: ${comingSoon ? 'coming soon' : value}`}>
      <div className="stats-future-stat-top">
        <span>{label}</span>
        <span className="stats-soon-tag">SOON</span>
      </div>
      <strong>{value ?? '—'}</strong>
    </div>
  )
}

function futureStatValues(stats: PlayerStats): Array<{ label: string; value: string | undefined }> {
  return [
    { label: 'ACCURACY', value: stats.accuracy === undefined ? undefined : `${stats.accuracy}%` },
    { label: 'STREAK', value: stats.streak === undefined ? undefined : String(stats.streak) },
    { label: 'BEST STREAK', value: stats.bestStreak === undefined ? undefined : String(stats.bestStreak) },
    { label: 'HINTS USED', value: stats.hintsUsed === undefined ? undefined : String(stats.hintsUsed) },
    { label: 'ATTEMPTS', value: stats.attempts === undefined ? undefined : String(stats.attempts) },
    {
      label: 'TIME PLAYED',
      value: stats.timePlayedMs === undefined
        ? undefined
        : `${Math.floor(stats.timePlayedMs / 60000)} min`,
    },
    {
      label: 'FIRST-TRY SOLVES',
      value: stats.firstTrySolves === undefined ? undefined : String(stats.firstTrySolves),
    },
    { label: 'CLASS RANK / LEADERBOARD', value: stats.classRank === undefined ? undefined : String(stats.classRank) },
  ]
}

export function StatsPanel({ onClose }: StatsPanelProps) {
  const [stats] = useState<PlayerStats>(() => getStatsSnapshot())
  const [profileName, setProfileNameState] = useState(() => getPlayerProfile().name)
  const [nameDraft, setNameDraft] = useState(() => getPlayerProfile().name)
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameMessage, setNameMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const backButtonRef = useRef<HTMLButtonElement>(null)
  const changeNameButtonRef = useRef<HTMLButtonElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => backButtonRef.current?.focus())
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      if (isEditingName) {
        setNameDraft(profileName)
        setIsEditingName(false)
        setNameMessage(null)
        window.requestAnimationFrame(() => changeNameButtonRef.current?.focus())
      } else {
        onClose()
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose, isEditingName, profileName])

  useEffect(() => {
    if (!isEditingName) return
    const frame = window.requestAnimationFrame(() => {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [isEditingName])

  const startEditingName = () => {
    setNameDraft(profileName)
    setNameMessage(null)
    setIsEditingName(true)
  }

  const cancelEditingName = () => {
    setNameDraft(profileName)
    setNameMessage(null)
    setIsEditingName(false)
    window.requestAnimationFrame(() => changeNameButtonRef.current?.focus())
  }

  const savePlayerName = () => {
    const result = setPlayerName(nameDraft)
    if (!result.ok) {
      setNameMessage({ kind: 'error', text: result.error })
      nameInputRef.current?.focus()
      return
    }
    setProfileNameState(result.profile.name)
    setNameDraft(result.profile.name)
    setIsEditingName(false)
    setNameMessage({ kind: 'success', text: 'Name saved!' })
    window.requestAnimationFrame(() => changeNameButtonRef.current?.focus())
  }

  const trapFocus = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab') return
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    )
    if (!focusable?.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    } else if (!dialogRef.current?.contains(document.activeElement)) {
      event.preventDefault()
      first.focus()
    }
  }

  const closeWhenOutside = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose()
  }

  const futureStats = futureStatValues(stats)

  return (
    <div className="stats-overlay" role="presentation" onMouseDown={closeWhenOutside}>
      <section
        ref={dialogRef}
        className="stats-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stats-panel-title"
        onKeyDown={trapFocus}
      >
        <header className="stats-header">
          <button
            ref={backButtonRef}
            type="button"
            className="stats-back-button"
            onClick={onClose}
          >
            <span aria-hidden="true">◄</span> BACK
          </button>
          <div className="stats-header-title">
            <div className="stats-eyebrow">PLAYER RECORD</div>
            <h1 id="stats-panel-title">PLAYER STATS</h1>
          </div>
          <div className="stats-header-mark" aria-hidden="true">DSA / QUEST</div>
        </header>

        <div className="stats-panel-scroll">
          <div className="stats-layout">
            <aside className="stats-card stats-character-card">
              <div className="stats-section-heading">
                <h2>CHARACTER</h2>
                <span className="stats-card-index">01</span>
              </div>
              <div className="stats-character-portrait">
                <div
                  className="stats-character-sprite"
                  style={{ backgroundImage: `url("${hunterIdleUrl}")` }}
                  aria-hidden="true"
                />
                <span className="stats-character-shadow" aria-hidden="true" />
              </div>
              <div className="stats-profile-label">PLAYER NAME</div>
              {!isEditingName ? (
                <div className="stats-player-name-row">
                  <strong className="stats-player-name-display">{profileName}</strong>
                  <button
                    ref={changeNameButtonRef}
                    type="button"
                    className="stats-change-name-button"
                    onClick={startEditingName}
                  >
                    CHANGE NAME
                  </button>
                </div>
              ) : (
                <div className="stats-name-editor">
                  <input
                    ref={nameInputRef}
                    id="stats-player-name"
                    className="stats-player-name-input"
                    type="text"
                    value={nameDraft}
                    onChange={(event) => setNameDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        event.stopPropagation()
                        savePlayerName()
                      } else if (event.key === 'Escape') {
                        event.preventDefault()
                        event.stopPropagation()
                        cancelEditingName()
                      }
                    }}
                    maxLength={64}
                    autoComplete="off"
                    aria-label="Player name"
                    aria-describedby={nameMessage?.kind === 'error' ? 'stats-name-error' : undefined}
                  />
                  <div className="stats-name-editor-actions">
                    <button type="button" className="stats-name-save-button" onClick={savePlayerName}>SAVE</button>
                    <button type="button" className="stats-name-cancel-button" onClick={cancelEditingName}>CANCEL</button>
                  </div>
                </div>
              )}
              {nameMessage && (
                <p
                  id={nameMessage.kind === 'error' ? 'stats-name-error' : undefined}
                  className={`stats-name-message is-${nameMessage.kind}`}
                  role="status"
                  aria-live="polite"
                >
                  {nameMessage.text}
                </p>
              )}
              <div className="stats-level-badge">
                <span>PLAYER LEVEL</span>
                <strong>LV {stats.level}</strong>
              </div>
              <p className="stats-character-footnote">NAME SAVES ON ENTER OR WHEN YOU LEAVE THE FIELD</p>
            </aside>

            <div className="stats-content-column">
              <section className="stats-card stats-xp-card" aria-labelledby="stats-xp-heading">
                <div className="stats-xp-head">
                  <div>
                    <div className="stats-eyebrow">ADVENTURE PROGRESS</div>
                    <h2 id="stats-xp-heading">LEVEL &amp; XP</h2>
                  </div>
                  <strong className="stats-level-chip">LV {stats.level}</strong>
                </div>
                <div className="stats-xp-number-row">
                  <strong>{stats.xp.toLocaleString()} XP</strong>
                  <span>{stats.xpIntoLevel} / {stats.xpPerLevel} XP TO NEXT LEVEL</span>
                </div>
                <div
                  className="stats-xp-meter"
                  role="progressbar"
                  aria-label="Progress toward next level"
                  aria-valuemin={0}
                  aria-valuemax={stats.xpPerLevel}
                  aria-valuenow={stats.xpIntoLevel}
                  aria-valuetext={`${stats.xpIntoLevel} of ${stats.xpPerLevel} XP to next level`}
                >
                  <span style={{ width: `${stats.levelProgressPercent}%` }} />
                </div>
                <p className="stats-xp-caption">Every 100 XP advances one level. Your total XP is read from the quest save.</p>
                <div className="stats-quick-metrics">
                  <div className="stats-metric-card">
                    <span className="stats-metric-label">QUESTS</span>
                    <strong>{stats.completedQuests}<small> / {stats.totalQuests}</small></strong>
                    <span className="stats-metric-caption">COMPLETED</span>
                  </div>
                  <div className="stats-metric-card">
                    <span className="stats-metric-label">QUESTIONS SEEN</span>
                    <strong>{stats.questionsSeen}</strong>
                    <span className="stats-metric-caption">UNIQUE QUIZ HISTORY</span>
                  </div>
                </div>
                <div className="stats-active-quest">
                  <span>CURRENT QUEST</span>
                  <strong>{stats.activeQuestTitle ?? 'No active quest'}</strong>
                </div>
              </section>

              <section className="stats-card stats-topic-card" aria-labelledby="stats-topic-heading">
                <div className="stats-section-heading">
                  <h2 id="stats-topic-heading">TOPIC PROGRESS</h2>
                  <span className="stats-card-note">7 TOPICS PLANNED</span>
                </div>
                <div className="stats-topic-list">
                  {stats.topics.map((topic) => <TopicRow key={topic.id} topic={topic} />)}
                </div>
              </section>

              <div className="stats-lower-grid">
                <section className="stats-card stats-recent-card" aria-labelledby="stats-recent-heading">
                  <div className="stats-section-heading">
                    <h2 id="stats-recent-heading">RECENT QUESTS</h2>
                    <span className="stats-card-index">03</span>
                  </div>
                  {stats.recentQuests.length === 0 ? (
                    <p className="stats-empty-state">No quests completed yet. Talk to the Elder!</p>
                  ) : (
                    <div className="stats-recent-list">
                      {stats.recentQuests.map((quest) => (
                        <div className="stats-recent-row" key={quest.id}>
                          <span className="stats-quest-check" aria-hidden="true">✓</span>
                          <div className="stats-recent-copy">
                            <strong>{quest.title}</strong>
                            <span>COMPLETED</span>
                          </div>
                          <span className="stats-recent-xp">+{quest.xpEarned} XP</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="stats-card stats-achievements-card" aria-labelledby="stats-achievements-heading">
                  <div className="stats-section-heading">
                    <h2 id="stats-achievements-heading">ACHIEVEMENTS</h2>
                    <span className="stats-card-index">04</span>
                  </div>
                  <div className="stats-achievement-grid">
                    {stats.achievements.map((achievement) => (
                      <div
                        className={`stats-achievement ${achievement.unlocked ? 'is-unlocked' : 'is-locked'}`}
                        key={achievement.id}
                        aria-label={`${achievement.title}: ${achievement.unlocked ? 'unlocked' : 'coming soon'}`}
                      >
                        <span className="stats-achievement-icon" aria-hidden="true">{achievement.unlocked ? '★' : '◇'}</span>
                        <strong>{achievement.title}</strong>
                        <span>{achievement.unlocked ? 'UNLOCKED' : 'COMING SOON'}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <section className="stats-card stats-future-card" aria-labelledby="stats-future-heading">
                <div className="stats-section-heading">
                  <div>
                    <h2 id="stats-future-heading">FUTURE STATS</h2>
                    <p className="stats-future-intro">These values are not tracked yet. No performance numbers are estimated.</p>
                  </div>
                  <span className="stats-card-note">PLANNED</span>
                </div>
                <div className="stats-future-grid">
                  {futureStats.map((item) => <FutureStatCard key={item.label} {...item} />)}
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
