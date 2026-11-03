import { readStoredSession } from '../multiplayer/auth'
import { getMultiplayerConfig } from '../multiplayer/realtime'
import { useSyncExternalStore } from 'react'
import { CAMPAIGN_TOPICS, createInitialCampaignProgress } from './campaignDefinitions'
import { isCampaignSave, migrateLegacySave } from './saveMigration'
import type {
  CampaignProgress,
  CampaignSave,
  CampaignSnapshot,
  CampaignTopicId,
  ChallengeId,
  ChallengeResult,
  MasteryGrade,
  OpeningStoryStatus,
  PlayerPosition,
  QuestId,
  QuestRecord,
  QuestViewState,
  TopicCompletionResult,
} from './questTypes'

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
let playerPosition: PlayerPosition | undefined
let campaignProgress = createInitialCampaignProgress()
const listeners = new Set<Listener>()
const SAVE_KEY = 'dsa-quest-save-v2'
const LEGACY_SAVE_KEY = 'dsa-quest-save-v1'
let saveStatusToken = 0

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

export type QuestSave = CampaignSave

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

function copyCampaignProgress(progress: CampaignProgress): CampaignProgress {
  return {
    ...progress,
    topics: Object.fromEntries(
      CAMPAIGN_TOPICS.map((topic) => [topic.id, { ...progress.topics[topic.id] }]),
    ) as CampaignProgress['topics'],
    relicEntitlements: [...progress.relicEntitlements],
    firstCompletionRewardClaims: [...progress.firstCompletionRewardClaims],
    openingStory: { ...progress.openingStory },
  }
}

function isMasteryGrade(value: unknown): value is MasteryGrade {
  return value === 'S' || value === 'A' || value === 'B' || value === 'C' || value === 'D'
}

function parseCampaignSave(raw: string | null): CampaignSave | null {
  if (raw === null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return isCampaignSave(parsed) ? parsed : null
  } catch {
    return null
  }
}

function reportSaveRecoveryCondition(message: string): void {
  console.error(`[DSA Quest] Save recovery required: ${message}`)
}

function saveCampaignMutation(eventType: string): void {
  recordQuestActivity(eventType)
  emit()
  QuestManager.save()
}

function setStatus(id: QuestId, status: QuestRecord['status']) {
  const quest = find(id)
  if (!quest || quest.status === status) {
    return
  }
  quest.status = status
  if (id === 'speak-with-elder') {
    campaignProgress.elderIntroductoryMilestone = status
  }
  recordQuestActivity(status === 'active' ? 'quest_started' : status === 'completed' ? 'quest_completed' : status === 'failed' ? 'quest_failed' : 'progress_snapshot', quest)
  emit()
  // Quest transitions are durable immediately; the scene adds the latest player position
  // on its next tick (and shows the visible SAVING/SAVED indicator for completed tasks).
  QuestManager.save()
}

export const QuestManager = {
  hasSave(): boolean {
    return this.getSave() !== null
  },

  save(position?: { x: number; y: number }, showStatus = false): boolean {
    const statusToken = showStatus ? ++saveStatusToken : saveStatusToken
    if (position) playerPosition = { ...position }
    if (showStatus && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dsaq:save-status', { detail: 'saving' }))
    }
    try {
      const currentV2Raw = localStorage.getItem(SAVE_KEY)
      if (currentV2Raw !== null && !parseCampaignSave(currentV2Raw)) {
        reportSaveRecoveryCondition(
          'the V2 save exists but is invalid; it and the V1 backup were preserved without overwriting either.',
        )
        return false
      }
      const previous = this.getSave()
      const save: QuestSave = {
        ...copyCampaignProgress(campaignProgress),
        version: 2,
        savedAt: Date.now(),
        quests: Object.fromEntries(records.map((quest) => [quest.id, quest.status])),
        xp: playerXp,
        position: position ? { ...position } : playerPosition ?? previous?.position,
      }
      const serialized = JSON.stringify(save)
      localStorage.setItem(SAVE_KEY, serialized)
      const readBack = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null') as unknown
      if (!isCampaignSave(readBack) || readBack.version !== 2 || readBack.xp !== save.xp) {
        throw new Error('Save verification failed')
      }
      if (showStatus && typeof window !== 'undefined') window.setTimeout(() => {
        if (statusToken === saveStatusToken) window.dispatchEvent(new CustomEvent('dsaq:save-status', { detail: 'saved' }))
      }, 350)
      return true
    } catch {
      if (showStatus && typeof window !== 'undefined' && statusToken === saveStatusToken) {
        window.dispatchEvent(new CustomEvent('dsaq:save-status', { detail: 'error' }))
      }
      return false
    }
  },

  getSave(): QuestSave | null {
    let version2Raw: string | null
    try {
      version2Raw = localStorage.getItem(SAVE_KEY)
    } catch {
      return null
    }

    if (version2Raw !== null) {
      const parsed = parseCampaignSave(version2Raw)
      if (parsed) return parsed
      reportSaveRecoveryCondition(
        'the V2 save exists but is invalid; it and the V1 backup were preserved instead of falling back to the older save.',
      )
      return null
    }

    try {
      const legacyRaw = localStorage.getItem(LEGACY_SAVE_KEY)
      if (!legacyRaw) return null
      const migrated = migrateLegacySave(JSON.parse(legacyRaw) as unknown)
      if (!migrated) return null

      const serialized = JSON.stringify(migrated)
      localStorage.setItem(SAVE_KEY, serialized)
      const readBack: unknown = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null')
      if (
        !isCampaignSave(readBack) ||
        readBack.version !== 2 ||
        readBack.savedAt !== migrated.savedAt ||
        readBack.xp !== migrated.xp ||
        JSON.stringify(readBack.position) !== JSON.stringify(migrated.position) ||
        JSON.stringify(readBack.quests) !== JSON.stringify(migrated.quests) ||
        JSON.stringify(readBack.topics) !== JSON.stringify(migrated.topics) ||
        JSON.stringify(readBack.relicEntitlements) !== JSON.stringify(migrated.relicEntitlements) ||
        JSON.stringify(readBack.firstCompletionRewardClaims) !==
          JSON.stringify(migrated.firstCompletionRewardClaims) ||
        readBack.activeTopicId !== migrated.activeTopicId ||
        readBack.elderIntroductoryMilestone !== migrated.elderIntroductoryMilestone ||
        readBack.openingStory.status !== migrated.openingStory.status ||
        readBack.openingStory.storyVersion !== migrated.openingStory.storyVersion ||
        readBack.relicReturnStatus !== migrated.relicReturnStatus ||
        readBack.epilogueStatus !== migrated.epilogueStatus
      ) {
        reportSaveRecoveryCondition(
          'V1 migration read-back verification failed; the V1 backup was preserved.',
        )
        return null
      }
      return readBack
    } catch {
      reportSaveRecoveryCondition(
        'V1 migration could not be written or verified; the V1 backup was preserved.',
      )
      return null
    }
  },

  restore(save: QuestSave): void {
    if (!isCampaignSave(save)) return
    records = buildRecords().map((quest) => ({
      ...quest,
      status: save.quests[quest.id] ?? quest.status,
    }))
    playerXp = save.xp
    playerPosition = save.position ? { ...save.position } : undefined
    campaignProgress = copyCampaignProgress(save)
    pendingChallenge = null
    lastResult = null
    emit()
  },

  clearSave(): void {
    try {
      localStorage.removeItem(SAVE_KEY)
    } catch {}
    try {
      localStorage.removeItem(LEGACY_SAVE_KEY)
    } catch {}
  },

  getCampaign(): CampaignSnapshot {
    return {
      ...copyCampaignProgress(campaignProgress),
      xp: playerXp,
      ...(playerPosition ? { position: { ...playerPosition } } : {}),
    }
  },

  /** Starts the next available topic, or retries/replays an already started one. */
  startTopic(id: CampaignTopicId): boolean {
    const definition = CAMPAIGN_TOPICS.find((topic) => topic.id === id)
    const progress = campaignProgress.topics[id]
    if (
      !definition ||
      !progress ||
      (campaignProgress.activeTopicId !== null && campaignProgress.activeTopicId !== id) ||
      !['available', 'in-progress', 'completed'].includes(progress.status) ||
      (definition.prerequisite !== null &&
        campaignProgress.topics[definition.prerequisite].status !== 'completed')
    ) {
      return false
    }

    campaignProgress.activeTopicId = id
    if (progress.status !== 'completed') progress.status = 'in-progress'
    progress.attemptCount += 1
    saveCampaignMutation('campaign_topic_started')
    return true
  },

  /** Applies a topic result; first completion alone grants its XP and relic. */
  completeTopic(id: CampaignTopicId, result: TopicCompletionResult): boolean {
    const progress = campaignProgress.topics[id]
    const definition = CAMPAIGN_TOPICS.find((topic) => topic.id === id)
    if (
      !progress ||
      !definition ||
      campaignProgress.activeTopicId !== id ||
      (progress.status !== 'in-progress' && progress.status !== 'completed') ||
      (progress.status === 'in-progress' && progress.attemptCount < 1) ||
      typeof result?.passed !== 'boolean' ||
      !isMasteryGrade(result.masteryGrade) ||
      !Number.isInteger(result.hintsUsed) ||
      result.hintsUsed < 0
    ) {
      return false
    }
    progress.hintsUsed += result.hintsUsed
    if (result.passed) {
      const isFirstCompletion = !campaignProgress.firstCompletionRewardClaims.includes(id)
      progress.status = 'completed'
      if (isFirstCompletion) {
        campaignProgress.firstCompletionRewardClaims.push(id)
        if (!campaignProgress.relicEntitlements.includes(definition.relicId)) {
          campaignProgress.relicEntitlements.push(definition.relicId)
        }
        playerXp += definition.firstCompletionXp
      }
      if (
        !progress.bestMasteryGrade ||
        ['S', 'A', 'B', 'C', 'D'].indexOf(result.masteryGrade) <
          ['S', 'A', 'B', 'C', 'D'].indexOf(progress.bestMasteryGrade)
      ) {
        progress.bestMasteryGrade = result.masteryGrade
      }

      const nextTopic = CAMPAIGN_TOPICS.find((topic) => topic.prerequisite === id)
      if (nextTopic && campaignProgress.topics[nextTopic.id].status === 'locked') {
        campaignProgress.topics[nextTopic.id].status = 'available'
      }
    } else if (progress.status !== 'completed') {
      progress.status = 'available'
    }

    campaignProgress.activeTopicId = null
    saveCampaignMutation(result.passed ? 'campaign_topic_completed' : 'campaign_topic_failed')
    return result.passed
  },

  /** Records the opening story outcome without affecting progression or rewards. */
  markOpeningStorySeen(status: OpeningStoryStatus, storyVersion: string): boolean {
    if (
      (status !== 'completed' && status !== 'skipped') ||
      typeof storyVersion !== 'string' ||
      storyVersion.trim().length === 0
    ) {
      return false
    }
    campaignProgress.openingStory = { status, storyVersion }
    saveCampaignMutation(status === 'skipped' ? 'opening_story_skipped' : 'opening_story_completed')
    return true
  },

  /** The relic return is available only after every campaign relic is entitled. */
  completeRelicReturn(): boolean {
    const allTopicsCompleted = CAMPAIGN_TOPICS.every(
      (topic) => campaignProgress.topics[topic.id].status === 'completed',
    )
    const allRelicsEntitled = CAMPAIGN_TOPICS.every(
      (topic) => campaignProgress.relicEntitlements.includes(topic.relicId),
    )
    if (
      campaignProgress.relicReturnStatus === 'completed' ||
      !allTopicsCompleted ||
      !allRelicsEntitled
    ) {
      return false
    }
    campaignProgress.relicReturnStatus = 'completed'
    saveCampaignMutation('campaign_relic_return_completed')
    return true
  },

  /** Completes the epilogue only after the seven topics and relic ceremony. */
  completeCampaign(): boolean {
    const allTopicsCompleted = CAMPAIGN_TOPICS.every(
      (topic) => campaignProgress.topics[topic.id].status === 'completed',
    )
    const allRelicsEntitled = CAMPAIGN_TOPICS.every(
      (topic) => campaignProgress.relicEntitlements.includes(topic.relicId),
    )
    if (
      campaignProgress.epilogueStatus === 'completed' ||
      campaignProgress.relicReturnStatus !== 'completed' ||
      !allTopicsCompleted ||
      !allRelicsEntitled
    ) {
      return false
    }
    campaignProgress.epilogueStatus = 'completed'
    saveCampaignMutation('campaign_completed')
    return true
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
    this.save()
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
    playerPosition = undefined
    campaignProgress = createInitialCampaignProgress()
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
