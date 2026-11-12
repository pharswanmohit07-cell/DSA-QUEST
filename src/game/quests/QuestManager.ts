import { readStoredSession } from '../multiplayer/auth'
import { getMultiplayerConfig } from '../multiplayer/realtime'
import { useSyncExternalStore } from 'react'
import { CAMPAIGN_TOPICS, createInitialCampaignProgress } from './campaignDefinitions'
import { calculateFinalMasteryGrade } from './masteryGrading'
import {
  isCampaignSaveV2,
  migrateCampaignSave,
  normalizeCampaignSaveV3,
} from './saveMigration'
import type {
  CampaignProgress,
  CampaignSave,
  CampaignSaveV2,
  CampaignSaveV3Input,
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
  SideQuestCompletionResult,
  SideQuestStartResult,
  SideQuestVisitResult,
  TopicCompletionResult,
} from './questTypes'
import {
  createDefaultNorthernSnowfieldScoutingProgress,
  createDefaultVillageTrainingRouteProgress,
} from './questTypes'
import { isVillageTrainingRouteEligible } from './villageTrainingRouteRouting'
import { clearElderPrologueStage } from './elderLearningStages'
import { clearKnowledgeScrolls } from './knowledgeScrolls'
import { clearArraysCampaignStage } from './arraysCampaignStages'

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
    title: 'The Old Man\u2019s Summons',
    objective: 'Speak with the Old Man near the south-west stairs.',
    description:
      'The Old Man has been waiting at the foot of the dojo stairs. Speak with him to hear what he needs.',
    requires: [],
  },
  {
    id: 'array-sorting-challenge',
    title: 'Array / Stack Operations',
    objective: 'Learn arrays with the Old Man, complete the practice questions, then solve the gate puzzle.',
    description:
      'Follow the Old Man’s array lesson, answer the practice questions, then solve the array-backed stack puzzle to open the torii gate. Knowledge Scroll challenges are optional rewards.',
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
let legacyCompletionXpCompensated = false
let northernSnowfieldScouting = createDefaultNorthernSnowfieldScoutingProgress()
let villageTrainingRoute = createDefaultVillageTrainingRouteProgress()
let sideQuestNeedsReconciliation = false
const listeners = new Set<Listener>()
const SAVE_KEY = 'dsa-quest-save-v3'
const V2_SAVE_KEY = 'dsa-quest-save-v2'
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
    campaign: copyCampaignProgress(campaignProgress),
    quests: records,
    activeQuest: records.find((quest) => quest.status === 'active') ?? null,
    challenge: pendingChallenge,
    lastResult,
    xp: playerXp,
    northernSnowfieldScouting: { ...northernSnowfieldScouting },
    villageTrainingRoute: { ...villageTrainingRoute },
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
    return normalizeCampaignSaveV3(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

function parseCampaignSaveV2(raw: string | null): CampaignSaveV2 | null {
  if (raw === null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return isCampaignSaveV2(parsed) ? parsed : null
  } catch {
    return null
  }
}

function hasNorthernSnowfieldScoutingField(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.prototype.hasOwnProperty.call(value, 'northernSnowfieldScouting')
  )
}

function hasVillageTrainingRouteField(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.prototype.hasOwnProperty.call(value, 'villageTrainingRoute')
  )
}

type CanonicalSaveRead =
  | { status: 'valid'; save: CampaignSave }
  | { status: 'missing' }
  | { status: 'invalid' | 'unreadable' }

type SideQuestPersistResult = 'persisted' | 'persistence-failed' | 'recovery-required'

function readCanonicalV3Save(): CanonicalSaveRead {
  let raw: string | null
  try {
    raw = localStorage.getItem(SAVE_KEY)
  } catch {
    return { status: 'unreadable' }
  }
  if (raw === null) return { status: 'missing' }
  const save = parseCampaignSave(raw)
  return save ? { status: 'valid', save } : { status: 'invalid' }
}

function saveFromRuntime(
  sideQuestProgress: CampaignSave['northernSnowfieldScouting'],
  xp = playerXp,
  trainingRouteProgress: CampaignSave['villageTrainingRoute'] = villageTrainingRoute,
): CampaignSave {
  const previous = QuestManager.getSave()
  return {
    ...copyCampaignProgress(campaignProgress),
    version: 3,
    savedAt: Date.now(),
    quests: Object.fromEntries(records.map((quest) => [quest.id, quest.status])),
    xp,
    position: playerPosition ? { ...playerPosition } : previous?.position,
    legacyCompletionXpCompensated:
      previous?.legacyCompletionXpCompensated ?? legacyCompletionXpCompensated,
    northernSnowfieldScouting: { ...sideQuestProgress },
    villageTrainingRoute: { ...trainingRouteProgress },
  }
}

function applySaveToRuntime(save: CampaignSave): void {
  records = buildRecords().map((quest) => ({
    ...quest,
    status: save.quests[quest.id] ?? quest.status,
  }))
  playerXp = save.xp
  playerPosition = save.position ? { ...save.position } : undefined
  campaignProgress = copyCampaignProgress(save)
  legacyCompletionXpCompensated = save.legacyCompletionXpCompensated
  northernSnowfieldScouting = { ...save.northernSnowfieldScouting }
  villageTrainingRoute = { ...save.villageTrainingRoute }
  pendingChallenge = null
  lastResult = null
  sideQuestNeedsReconciliation = false
  emit()
}

function runtimeMatchesSave(save: CampaignSave): boolean {
  const runtimeSave = saveFromRuntime(northernSnowfieldScouting, playerXp, villageTrainingRoute)
  runtimeSave.savedAt = save.savedAt
  return JSON.stringify(runtimeSave) === JSON.stringify(save)
}

function reconcileCanonicalSideQuestState(): CampaignSave | null {
  const canonical = readCanonicalV3Save()
  if (canonical.status !== 'valid') {
    sideQuestNeedsReconciliation = true
    reportSaveRecoveryCondition(
      canonical.status === 'missing'
        ? 'the canonical V3 save is missing; side-quest mutations remain blocked until recovery.'
        : 'the canonical V3 save could not be read or validated; side-quest mutations remain blocked until recovery.',
    )
    return null
  }
  if (!runtimeMatchesSave(canonical.save)) applySaveToRuntime(canonical.save)
  else sideQuestNeedsReconciliation = false
  return canonical.save
}

function persistSideQuestCandidate(candidate: CampaignSave): SideQuestPersistResult {
  let previousRaw: string | null
  try {
    previousRaw = localStorage.getItem(SAVE_KEY)
  } catch {
    sideQuestNeedsReconciliation = true
    return 'recovery-required'
  }
  if (previousRaw !== null && !parseCampaignSave(previousRaw)) {
    sideQuestNeedsReconciliation = true
    reportSaveRecoveryCondition(
      'the V3 save exists but is invalid; the side-quest transition was not written.',
    )
    return 'recovery-required'
  }

  const serialized = JSON.stringify(candidate)
  try {
    localStorage.setItem(SAVE_KEY, serialized)
  } catch {
    sideQuestNeedsReconciliation = true
    try {
      return localStorage.getItem(SAVE_KEY) === previousRaw
        ? 'persistence-failed'
        : 'recovery-required'
    } catch {
      return 'recovery-required'
    }
  }

  try {
    const readBackValue: unknown = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null')
    const readBack = normalizeCampaignSaveV3(readBackValue)
    if (
      !readBack ||
      !hasNorthernSnowfieldScoutingField(readBackValue) ||
      !hasVillageTrainingRouteField(readBackValue) ||
      JSON.stringify(readBack) !== JSON.stringify(candidate)
    ) {
      sideQuestNeedsReconciliation = true
      return 'recovery-required'
    }
  } catch {
    sideQuestNeedsReconciliation = true
    return 'recovery-required'
  }

  sideQuestNeedsReconciliation = false
  return 'persisted'
}

function persistMigratedSave(migrated: CampaignSave, source: string): CampaignSave | null {
  try {
    const serialized = JSON.stringify(migrated)
    localStorage.setItem(SAVE_KEY, serialized)
    const readBackValue: unknown = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null')
    const readBack = normalizeCampaignSaveV3(
      readBackValue,
    )
    if (
      !readBack ||
      !hasNorthernSnowfieldScoutingField(readBackValue) ||
      readBack.version !== 3 ||
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
      JSON.stringify(readBack.openingStory) !== JSON.stringify(migrated.openingStory) ||
      readBack.relicReturnStatus !== migrated.relicReturnStatus ||
      readBack.epilogueStatus !== migrated.epilogueStatus ||
      readBack.finalMasteryGrade !== migrated.finalMasteryGrade ||
      readBack.legacyCompletionXpCompensated !== migrated.legacyCompletionXpCompensated ||
      JSON.stringify(readBack.northernSnowfieldScouting) !==
        JSON.stringify(migrated.northernSnowfieldScouting) ||
      JSON.stringify(readBack.villageTrainingRoute) !==
        JSON.stringify(migrated.villageTrainingRoute)
    ) {
      reportSaveRecoveryCondition(
        `${source} migration read-back verification failed; the original save was preserved.`,
      )
      return null
    }
    return readBack
  } catch {
    reportSaveRecoveryCondition(
      `${source} migration could not be written or verified; the original save was preserved.`,
    )
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

  acceptNorthernSnowfieldScouting(): SideQuestStartResult {
    if (sideQuestNeedsReconciliation && !reconcileCanonicalSideQuestState()) {
      return 'recovery-required'
    }

    if (northernSnowfieldScouting.status === 'active') return 'already-started'
    if (northernSnowfieldScouting.status !== 'not-started') return 'not-eligible'

    const candidate = saveFromRuntime({
      ...northernSnowfieldScouting,
      status: 'active',
    })
    const persisted = persistSideQuestCandidate(candidate)
    if (persisted !== 'persisted') return persisted

    applySaveToRuntime(candidate)
    return 'started'
  },

  recordNorthernSnowfieldVisit(): SideQuestVisitResult {
    if (sideQuestNeedsReconciliation && !reconcileCanonicalSideQuestState()) {
      return 'recovery-required'
    }

    if (
      northernSnowfieldScouting.status === 'active' &&
      northernSnowfieldScouting.snowfieldVisited
    ) {
      return 'already-visited'
    }
    if (
      northernSnowfieldScouting.status !== 'active' ||
      northernSnowfieldScouting.rewardClaimed
    ) {
      return 'not-eligible'
    }

    const candidate = saveFromRuntime({
      ...northernSnowfieldScouting,
      snowfieldVisited: true,
    })
    const persisted = persistSideQuestCandidate(candidate)
    if (persisted !== 'persisted') return persisted

    applySaveToRuntime(candidate)
    return 'visited'
  },

  completeNorthernSnowfieldScouting(): SideQuestCompletionResult {
    const canonical = reconcileCanonicalSideQuestState()
    if (!canonical) return 'recovery-required'

    if (
      canonical.northernSnowfieldScouting.status === 'completed' &&
      canonical.northernSnowfieldScouting.rewardClaimed
    ) {
      return 'already-completed'
    }
    if (
      canonical.northernSnowfieldScouting.status !== 'active' ||
      !canonical.northernSnowfieldScouting.snowfieldVisited ||
      canonical.northernSnowfieldScouting.rewardClaimed
    ) {
      return 'not-eligible'
    }

    const candidate = saveFromRuntime(
      {
        ...canonical.northernSnowfieldScouting,
        status: 'completed',
        rewardClaimed: true,
      },
      canonical.xp + 25,
    )
    const persisted = persistSideQuestCandidate(candidate)
    if (persisted !== 'persisted') return persisted

    applySaveToRuntime(candidate)
    return 'completed'
  },

  acceptVillageTrainingRoute(): SideQuestStartResult {
    if (sideQuestNeedsReconciliation && !reconcileCanonicalSideQuestState()) {
      return 'recovery-required'
    }

    if (villageTrainingRoute.status === 'active') return 'already-started'
    if (villageTrainingRoute.status !== 'not-started') return 'not-eligible'
    if (!isVillageTrainingRouteEligible(campaignProgress)) return 'not-eligible'

    const candidate = saveFromRuntime(northernSnowfieldScouting, playerXp, {
      ...villageTrainingRoute,
      status: 'active',
      stage: 'visit-monk',
    })
    const persisted = persistSideQuestCandidate(candidate)
    if (persisted !== 'persisted') return persisted

    applySaveToRuntime(candidate)
    return 'started'
  },

  acknowledgeVillageMonk(): SideQuestVisitResult {
    if (sideQuestNeedsReconciliation && !reconcileCanonicalSideQuestState()) {
      return 'recovery-required'
    }

    if (
      villageTrainingRoute.status === 'active' &&
      villageTrainingRoute.stage === 'visit-samurai'
    ) {
      return 'already-visited'
    }
    if (
      villageTrainingRoute.status !== 'active' ||
      villageTrainingRoute.stage !== 'visit-monk'
    ) {
      return 'not-eligible'
    }

    const candidate = saveFromRuntime(northernSnowfieldScouting, playerXp, {
      ...villageTrainingRoute,
      stage: 'visit-samurai',
    })
    const persisted = persistSideQuestCandidate(candidate)
    if (persisted !== 'persisted') return persisted

    applySaveToRuntime(candidate)
    return 'visited'
  },

  recordVillageTrainingTrialPass(): SideQuestVisitResult {
    if (sideQuestNeedsReconciliation && !reconcileCanonicalSideQuestState()) {
      return 'recovery-required'
    }

    if (
      villageTrainingRoute.status === 'active' &&
      villageTrainingRoute.stage === 'return-guide'
    ) {
      return 'already-visited'
    }
    if (
      villageTrainingRoute.status !== 'active' ||
      villageTrainingRoute.stage !== 'visit-samurai'
    ) {
      return 'not-eligible'
    }

    const candidate = saveFromRuntime(northernSnowfieldScouting, playerXp, {
      ...villageTrainingRoute,
      stage: 'return-guide',
    })
    const persisted = persistSideQuestCandidate(candidate)
    if (persisted !== 'persisted') return persisted

    applySaveToRuntime(candidate)
    return 'visited'
  },

  completeVillageTrainingRoute(): SideQuestCompletionResult {
    const canonical = reconcileCanonicalSideQuestState()
    if (!canonical) return 'recovery-required'

    if (
      canonical.villageTrainingRoute.status === 'completed' &&
      canonical.villageTrainingRoute.rewardClaimed
    ) {
      return 'already-completed'
    }
    if (
      canonical.villageTrainingRoute.status !== 'active' ||
      canonical.villageTrainingRoute.stage !== 'return-guide' ||
      canonical.villageTrainingRoute.rewardClaimed
    ) {
      return 'not-eligible'
    }

    // One atomic V3 write: completion state, reward flag, and the one-time
    // 25 XP grant travel together so the reward can never be split from the
    // completed status.
    const candidate = saveFromRuntime(
      canonical.northernSnowfieldScouting,
      canonical.xp + 25,
      {
        id: 'village-training-route',
        status: 'completed',
        stage: 'completed',
        rewardClaimed: true,
      },
    )
    const persisted = persistSideQuestCandidate(candidate)
    if (persisted !== 'persisted') return persisted

    applySaveToRuntime(candidate)
    return 'completed'
  },

  save(position?: { x: number; y: number }, showStatus = false): boolean {
    if (sideQuestNeedsReconciliation) return false
    const statusToken = showStatus ? ++saveStatusToken : saveStatusToken
    if (position) playerPosition = { ...position }
    if (showStatus && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dsaq:save-status', { detail: 'saving' }))
    }
    try {
      const currentV3Raw = localStorage.getItem(SAVE_KEY)
      if (currentV3Raw !== null && !parseCampaignSave(currentV3Raw)) {
        reportSaveRecoveryCondition(
          'the V3 save exists but is invalid; it and the V1/V2 backups were preserved without overwriting them.',
        )
        return false
      }
      const currentV2Raw = localStorage.getItem(V2_SAVE_KEY)
      if (currentV3Raw === null && currentV2Raw !== null && !parseCampaignSaveV2(currentV2Raw)) {
        reportSaveRecoveryCondition(
          'the V2 save exists but is invalid; it and the V1 backup were preserved without overwriting them.',
        )
        return false
      }
      const previous = this.getSave()
      legacyCompletionXpCompensated =
        previous?.legacyCompletionXpCompensated ?? legacyCompletionXpCompensated
      const save: QuestSave = {
        ...copyCampaignProgress(campaignProgress),
        version: 3,
        savedAt: Date.now(),
        quests: Object.fromEntries(records.map((quest) => [quest.id, quest.status])),
        xp: playerXp,
        position: position ? { ...position } : playerPosition ?? previous?.position,
        legacyCompletionXpCompensated,
        northernSnowfieldScouting: { ...northernSnowfieldScouting },
        villageTrainingRoute: { ...villageTrainingRoute },
      }
      const serialized = JSON.stringify(save)
      localStorage.setItem(SAVE_KEY, serialized)
      const readBackValue: unknown = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null')
      const readBack = normalizeCampaignSaveV3(
        readBackValue,
      )
      if (
        !readBack ||
        !hasNorthernSnowfieldScoutingField(readBackValue) ||
        !hasVillageTrainingRouteField(readBackValue) ||
        readBack.version !== 3 ||
        readBack.xp !== save.xp ||
        JSON.stringify(readBack.northernSnowfieldScouting) !==
          JSON.stringify(save.northernSnowfieldScouting) ||
        JSON.stringify(readBack.villageTrainingRoute) !==
          JSON.stringify(save.villageTrainingRoute)
      ) {
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
    let version3Raw: string | null
    try {
      version3Raw = localStorage.getItem(SAVE_KEY)
    } catch {
      return null
    }

    if (version3Raw !== null) {
      const parsed = parseCampaignSave(version3Raw)
      if (parsed) return parsed
      reportSaveRecoveryCondition(
        'the V3 save exists but is invalid; it and the V1/V2 backups were preserved instead of falling back to an older save.',
      )
      return null
    }

    try {
      const v2Raw = localStorage.getItem(V2_SAVE_KEY)
      if (v2Raw !== null) {
        const v2Save = parseCampaignSaveV2(v2Raw)
        if (!v2Save) {
          reportSaveRecoveryCondition(
            'the V2 save exists but is invalid; it and the V1 backup were preserved instead of falling back to an older save.',
          )
          return null
        }
        const migrated = migrateCampaignSave(v2Save)
        if (!migrated) return null
        return persistMigratedSave(migrated, 'V2')
      }

      const legacyRaw = localStorage.getItem(LEGACY_SAVE_KEY)
      if (!legacyRaw) return null
      const migrated = migrateCampaignSave(JSON.parse(legacyRaw) as unknown)
      if (!migrated) return null
      return persistMigratedSave(migrated, 'V1')
    } catch {
      reportSaveRecoveryCondition(
        'Save migration could not be read, written or verified; the original save was preserved.',
      )
      return null
    }
  },

  restore(save: CampaignSaveV3Input): void {
    const normalizedSave = normalizeCampaignSaveV3(save)
    if (!normalizedSave) return
    applySaveToRuntime(normalizedSave)
  },

  clearSave(): boolean {
    try {
      // The Elder prologue has its own versioned key; clear it as part of a
      // new-campaign reset so progress from the previous campaign cannot leak.
      if (!clearElderPrologueStage() || !clearKnowledgeScrolls()) return false
      clearArraysCampaignStage()
      for (const key of [LEGACY_SAVE_KEY, V2_SAVE_KEY, SAVE_KEY]) {
        localStorage.removeItem(key)
        if (localStorage.getItem(key) !== null) return false
      }
      legacyCompletionXpCompensated = false
      return true
    } catch {
      return false
    }
  },

  getCampaign(): CampaignSnapshot {
    return {
      ...copyCampaignProgress(campaignProgress),
      xp: playerXp,
      ...(playerPosition ? { position: { ...playerPosition } } : {}),
    }
  },

  /** Starts one topic attempt; re-entering the same active topic is idempotent. */
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

    // Stage transitions within a topic must not create new attempts. A
    // lesson, quiz and minigame share one active topic attempt; reopening the
    // same active topic simply resumes the in-memory attempt. After a failed
    // result (activeTopicId cleared) or a completed replay, this call starts a
    // distinct attempt and increments exactly once.
    if (campaignProgress.activeTopicId === id) {
      return true
    }

    campaignProgress.activeTopicId = id
    if (progress.status !== 'completed') progress.status = 'in-progress'
    progress.attemptCount += 1
    saveCampaignMutation('campaign_topic_started')
    return true
  },

  /** Applies a topic result; first completion alone grants its XP and relic. */
  completeTopic(id: CampaignTopicId, result: TopicCompletionResult): boolean {
    if (sideQuestNeedsReconciliation) return false
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
        playerXp += definition.firstCompletionXp
      }
      // A pre-existing relic entitlement is preserved even if it came from a
      // legacy save whose reward markers were incomplete. Never remove it or
      // award first-completion XP a second time for that topic.
      if (!campaignProgress.relicEntitlements.includes(definition.relicId)) {
        campaignProgress.relicEntitlements.push(definition.relicId)
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
    campaignProgress.finalMasteryGrade = calculateFinalMasteryGrade(campaignProgress)
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
    if (sideQuestNeedsReconciliation) {
      throw new Error('XP awards are blocked until canonical save reconciliation.')
    }
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
    clearArraysCampaignStage()
    records = buildRecords()
    pendingChallenge = null
    lastResult = null
    playerXp = 0
    playerPosition = undefined
    campaignProgress = createInitialCampaignProgress()
    legacyCompletionXpCompensated = false
    northernSnowfieldScouting = createDefaultNorthernSnowfieldScoutingProgress()
    villageTrainingRoute = createDefaultVillageTrainingRouteProgress()
    sideQuestNeedsReconciliation = false
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
