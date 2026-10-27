import { readStoredSession } from '../multiplayer/auth'
import { getMultiplayerConfig } from '../multiplayer/realtime'
import { useSyncExternalStore } from 'react'
import type { ChallengeId, ChallengeResult, QuestId, QuestRecord, QuestViewState } from './questTypes'

/**
 * Central quest state manager.
 *
 * The manager is the single owner of quest progress. It is deliberately
 * framework-free and transport-agnostic: the Phaser scene starts and completes
 * quests, the React overlays subscribe for display, and nothing else mutates
 * state. Transitions are validated, so a quest cannot be completed twice, failed
 * then completed, or started before its prerequisites are met.
 *
 * State is published through a tiny external store (see `questStore`) so the
 * modal can react to progress without the scene having to know React exists.
 */

const QUEST_DEFINITIONS: ReadonlyArray<Omit<QuestRecord, 'status'>> = [
  {
    id: 'speak-with-elder',
    title: 'The Elder\u2019s Summons',
    objective: 'Speak with Elder Hiro near the south-west stairs.',
    description:
      'Elder Hiro has been waiting at the foot of the dojo stairs. Speak with him to hear what he needs.',
    requires: [],
  },
  {
    id: 'array-sorting-challenge',
    title: 'Array / Stack Operations',
    objective: 'Pass Elder Hiro’s array quiz and stack trial to open the village gate.',
    description:
      'Learn the basics of arrays, pass Elder Hiro’s three-question quiz, then complete his stack sequence to open the torii gate.',
    requires: ['speak-with-elder'],
  },
]

/** Initial status per quest: the first is active, the rest wait on prerequisites. */
function initialStatuses(): Record<QuestId, QuestRecord['status']> {
  return {
    'speak-with-elder': 'active',
    'array-sorting-challenge': 'locked',
  }
}

type Listener = () => void

let records: QuestRecord[] = buildRecords()
let pendingChallenge: ChallengeId | null = null
let lastResult: ChallengeResult | null = null
let playerXp = 0
const listeners = new Set<Listener>()
const SAVE_KEY = 'dsa-quest-save-v1'

function recordQuestActivity(eventType: string, quest?: QuestRecord, xp = playerXp): void {
  const session = readStoredSession()
  const { url, key } = getMultiplayerConfig()
  if (!session?.access_token || !session.user.id || !url || !key) return
  void fetch(`${url.replace(/[/]+$/, '')}/functions/v1/dsa-quest-admin`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'record_progress', userId: session.user.id, eventType, questId: quest?.id, questTitle: quest?.title, questStatus: quest?.status, xp: Math.max(0, Math.floor(xp)) }),
  }).catch(() => { /* Best-effort telemetry must never interrupt gameplay. */ })
}

export type QuestSave = {
  version: 1
  savedAt: number
  quests: Partial<Record<QuestId, QuestRecord['status']>>
  xp: number
  position?: { x: number; y: number }
}

function buildRecords(): QuestRecord[] {
  const statuses = initialStatuses()
  return QUEST_DEFINITIONS.map((definition) => ({ ...definition, status: statuses[definition.id] }))
}

function snapshot(): QuestViewState {
  return {
    quests: records,
    activeQuest: records.find((quest) => quest.status === 'active') ?? null,
    challenge: pendingChallenge,
    lastResult,
    xp: playerXp,
  }
}

let cachedSnapshot: QuestViewState = snapshot()

function emit() {
  cachedSnapshot = snapshot()
  for (const listener of [...listeners]) {
    listener()
  }
}

function find(id: QuestId): QuestRecord | undefined {
  return records.find((quest) => quest.id === id)
}

function setStatus(id: QuestId, status: QuestRecord['status']) {
  const quest = find(id)
  if (!quest || quest.status === status) {
    return
  }
  quest.status = status
  recordQuestActivity(status === 'active' ? 'quest_started' : status === 'completed' ? 'quest_completed' : status === 'failed' ? 'quest_failed' : 'progress_snapshot', quest)
  emit()
}

export const QuestManager = {
  hasSave(): boolean {
    try {
      return localStorage.getItem(SAVE_KEY) !== null
    } catch {
      return false
    }
  },

  save(position?: { x: number; y: number }, showStatus = false): boolean {
    if (showStatus) window.dispatchEvent(new CustomEvent('dsaq:save-status', { detail: 'saving' }))
    try {
      const save: QuestSave = {
        version: 1,
        savedAt: Date.now(),
        quests: Object.fromEntries(records.map((quest) => [quest.id, quest.status])),
        xp: playerXp,
        position,
      }
      localStorage.setItem(SAVE_KEY, JSON.stringify(save))
      if (showStatus) window.setTimeout(() => window.dispatchEvent(new CustomEvent('dsaq:save-status', { detail: 'saved' })), 350)
      return true
    } catch {
      if (showStatus) window.dispatchEvent(new CustomEvent('dsaq:save-status', { detail: 'error' }))
      return false
    }
  },

  getSave(): QuestSave | null {
    try {
      const parsed = JSON.parse(localStorage.getItem(SAVE_KEY) ?? '') as Partial<QuestSave>
      if (parsed.version !== 1 || !parsed.quests || typeof parsed.xp !== 'number') {
        return null
      }
      return parsed as QuestSave
    } catch {
      return null
    }
  },

  restore(save: QuestSave): void {
    records = buildRecords().map((quest) => ({
      ...quest,
      status: save.quests[quest.id] ?? quest.status,
    }))
    playerXp = Math.max(0, Math.floor(save.xp))
    pendingChallenge = null
    lastResult = null
    emit()
  },

  clearSave(): void {
    try {
      localStorage.removeItem(SAVE_KEY)
    } catch {
      // Ignore unavailable storage.
    }
  },

  /** Every quest, with its current status. */
  getAll(): ReadonlyArray<QuestRecord> {
    return records
  },

  get(id: QuestId): QuestRecord | undefined {
    return find(id)
  },

  statusOf(id: QuestId): QuestRecord['status'] {
    return find(id)?.status ?? 'locked'
  },

  isActive(id: QuestId): boolean {
    return this.statusOf(id) === 'active'
  },

  isCompleted(id: QuestId): boolean {
    return this.statusOf(id) === 'completed'
  },

  /**
   * Puts a quest into `active`, but only if it is locked and every prerequisite
   * is already completed. Returns true when the state actually changed.
   *
   * Quest 1 is seeded active, so the first call for it is a no-op and the
   * Elder can hand it over without special-casing.
   */
  startQuest(id: QuestId): boolean {
    const quest = find(id)
    if (!quest || quest.status === 'active' || quest.status === 'completed') {
      return false
    }
    if (quest.requires.some((requirement) => this.statusOf(requirement) !== 'completed')) {
      return false
    }
    setStatus(id, 'active')
    return true
  },

  /**
   * Marks a quest completed and activates anything it was blocking.
   *
   * Completing an already-completed or failed quest is a no-op, so a double
   * submit cannot double-unlock the gate.
   */
  completeQuest(id: QuestId): boolean {
    const quest = find(id)
    if (!quest || quest.status !== 'active') {
      return false
    }
    setStatus(id, 'completed')
    for (const other of records) {
      if (other.status === 'locked' && other.requires.includes(id)) {
        // Only auto-activate when every prerequisite is now satisfied.
        if (other.requires.every((requirement) => this.statusOf(requirement) === 'completed')) {
          setStatus(other.id, 'active')
        }
      }
    }
    return true
  },

  /** Marks a quest failed. A failed quest can be retried by starting it again. */
  failQuest(id: QuestId): boolean {
    const quest = find(id)
    if (!quest || quest.status !== 'active') {
      return false
    }
    setStatus(id, 'failed')
    return true
  },

  awardXp(amount: number): void {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new RangeError('XP awards must be a positive integer')
    }
    playerXp += amount
    recordQuestActivity('xp_awarded', undefined, playerXp)
    emit()
  },

  /** Opens the legacy code challenge modal, freezing gameplay behind it. */
  openChallenge(challengeId: ChallengeId): void {
    pendingChallenge = challengeId
    lastResult = null
    emit()
  },

  /** Records a submission result. `passed` drives completion by the caller. */
  submitChallenge(result: ChallengeResult): void {
    lastResult = result
    emit()
  },

  /** Closes the modal, leaving quest state untouched. */
  closeChallenge(): void {
    pendingChallenge = null
    lastResult = null
    emit()
  },

  get isChallengeOpen(): boolean {
    return pendingChallenge !== null
  },

  /** Restores the starting state. Used by dev tooling and tests. */
  reset(): void {
    records = buildRecords()
    pendingChallenge = null
    lastResult = null
    playerXp = 0
    emit()
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },

  getSnapshot(): QuestViewState {
    return cachedSnapshot
  },
}

/** Subscribe a React component to quest progress. */
export function useQuestState(): QuestViewState {
  return useSyncExternalStore(
    QuestManager.subscribe,
    QuestManager.getSnapshot,
    QuestManager.getSnapshot,
  )
}
