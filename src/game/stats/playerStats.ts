import { getSeenArrayQuizQuestionIds } from '../challenge/challengeStore'
import { QuestManager, type QuestSave } from '../quests/QuestManager'
import { CAMPAIGN_TOPICS } from '../quests/campaignDefinitions'
import type {
  CampaignProgress,
  MasteryGrade,
  QuestId,
  QuestRecord,
  QuestStatus,
} from '../quests/questTypes'

const PROFILE_KEY = 'dsaq-player-profile-v1'
const PROFILE_VERSION = 1

/** One level requires exactly 100 cumulative XP. Level 1 starts at 0 XP. */
const XP_PER_LEVEL = 100

export type PlayerProfile = {
  version: 1
  name: string
  hasChosenName: boolean
  /** Reserved for future visual customization; currently always empty. */
  appearance: Record<string, never>
}

export type PlayerNameValidation =
  | { valid: true; normalizedName: string }
  | { valid: false; error: string }

export type SetPlayerNameResult =
  | { ok: true; profile: PlayerProfile }
  | { ok: false; error: string }

/**
 * The single name validator used when saving and when reading stored profiles.
 * Repeated whitespace collapses to one ordinary space before length/rule checks.
 */
export function validatePlayerName(value: string): PlayerNameValidation {
  const normalizedName = value.trim().replace(/\s+/g, ' ')
  if (!normalizedName) {
    return { valid: false, error: 'Enter a name for your hero.' }
  }
  if (normalizedName.length > 16) {
    return { valid: false, error: 'Name must be 16 characters or fewer.' }
  }
  if (!/^[A-Za-z0-9 _-]+$/.test(normalizedName)) {
    return { valid: false, error: 'Use letters, numbers, spaces, underscores, or hyphens only.' }
  }
  return { valid: true, normalizedName }
}

export type TopicStatus = 'not-started' | 'in-progress' | 'done' | 'coming-soon'

export type TopicProgress = {
  id: string
  name: string
  status: TopicStatus
  bestMasteryGrade: MasteryGrade | null
}

export type RecentQuest = {
  id: QuestId
  title: string
  xpEarned: number
}

export type Achievement = {
  id: string
  title: string
  description: string
  unlocked: boolean
}

export type PlayerStats = {
  xp: number
  level: number
  xpIntoLevel: number
  xpPerLevel: number
  levelProgressPercent: number
  completedQuests: number
  totalQuests: number
  activeQuestTitle: string | null
  finalMasteryGrade: MasteryGrade | null
  /** Unique quiz question IDs recorded by the challenge store as seen. */
  questionsSeen: number
  topics: TopicProgress[]
  recentQuests: RecentQuest[]
  achievements: Achievement[]

  // FUTURE: these values are not collected by the game yet. Keep them optional
  // so the UI can show "—" / SOON rather than manufacturing performance data.
  accuracy?: number
  streak?: number
  bestStreak?: number
  hintsUsed?: number
  attempts?: number
  timePlayedMs?: number
  firstTrySolves?: number
  classRank?: number
}

const DEFAULT_QUEST_STATUS: Record<QuestId, QuestStatus> = {
  'speak-with-elder': 'active',
  'array-sorting-challenge': 'locked',
}

const validStatuses = new Set<QuestStatus>(['locked', 'active', 'completed', 'failed'])

function isQuestStatus(value: unknown): value is QuestStatus {
  return typeof value === 'string' && validStatuses.has(value as QuestStatus)
}

function safeXp(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
}

function defaultProfile(): PlayerProfile {
  return { version: PROFILE_VERSION, name: 'Hero', hasChosenName: false, appearance: {} }
}

/** Read player name/profile; old, malformed or unavailable storage safely becomes Hero. */
export function getPlayerProfile(): PlayerProfile {
  if (typeof window === 'undefined') return defaultProfile()
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY)
    if (!raw) return defaultProfile()
    const parsed: unknown = JSON.parse(raw)
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !('version' in parsed) ||
      parsed.version !== PROFILE_VERSION ||
      !('name' in parsed) ||
      typeof parsed.name !== 'string' ||
      !('hasChosenName' in parsed) ||
      parsed.hasChosenName !== true
    ) {
      // Profiles from the earlier schema don't have hasChosenName. Treat them
      // as the safe default instead of trusting an incomplete/corrupted value.
      return defaultProfile()
    }
    const validation = validatePlayerName(parsed.name)
    if (!validation.valid) return defaultProfile()
    return {
      version: PROFILE_VERSION,
      name: validation.normalizedName,
      hasChosenName: true,
      appearance: {},
    }
  } catch {
    return defaultProfile()
  }
}

/** Validate and persist a player name, then notify an active Phaser scene. */
export function setPlayerName(name: string): SetPlayerNameResult {
  const validation = validatePlayerName(name)
  if (!validation.valid) return { ok: false, error: validation.error }
  if (typeof window === 'undefined') {
    return { ok: false, error: 'This browser cannot save the player name right now.' }
  }

  const profile: PlayerProfile = {
    version: PROFILE_VERSION,
    name: validation.normalizedName,
    hasChosenName: true,
    appearance: {},
  }
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  } catch {
    return { ok: false, error: 'Could not save your name in this browser. Check storage settings and try again.' }
  }
  window.dispatchEvent(new CustomEvent<string>('dsaq:player-name-changed', { detail: profile.name }))
  return { ok: true, profile }
}

function questStatusesFromSave(
  quests: ReadonlyArray<QuestRecord>,
  save: QuestSave | null,
  useSavedState: boolean,
): QuestRecord[] {
  return quests.map((quest) => {
    const savedStatus = useSavedState ? save?.quests[quest.id] : undefined
    return {
      ...quest,
      status: isQuestStatus(savedStatus) ? savedStatus : quest.status,
    }
  })
}

function xpRewardForCompletedQuest(id: QuestId): number {
  // Current implementation awards 50 XP when Array / Stack Operations completes.
  // The Old Man's Summons has no XP award in MainScene. The save schema has no
  // per-quest history, so this uses only the rewards explicitly present in code.
  return id === 'array-sorting-challenge' ? 50 : 0
}

function topicProgress(campaign: Pick<CampaignProgress, 'topics'>): TopicProgress[] {
  const statusMap: Record<CampaignProgress['topics'][keyof CampaignProgress['topics']]['status'], TopicStatus> = {
    locked: 'coming-soon',
    available: 'not-started',
    'in-progress': 'in-progress',
    completed: 'done',
  }
  return CAMPAIGN_TOPICS.map((topic) => {
    const progress = campaign.topics[topic.id]
    return {
      id: topic.id,
      name: topic.displayName,
      status: statusMap[progress.status],
      bestMasteryGrade: progress.bestMasteryGrade,
    }
  })
}

/** Read-only summary. It never changes QuestManager or challengeStore state. */
export function getStatsSnapshot(): PlayerStats {
  const live = QuestManager.getSnapshot()
  const liveQuests = [...QuestManager.getAll()]
  const saved = QuestManager.getSave()
  // The home screen appears before MainScene restores an existing save. If the
  // manager still has its untouched startup state, display the valid saved values.
  const isUntouchedStartup = safeXp(live.xp) === 0 &&
    liveQuests.every((quest) => quest.status === DEFAULT_QUEST_STATUS[quest.id])
  const useSavedState = Boolean(saved && isUntouchedStartup)
  const quests = questStatusesFromSave(liveQuests, saved, useSavedState)
  const xp = safeXp(useSavedState ? saved?.xp : live.xp)
  const campaign = useSavedState && saved ? saved : QuestManager.getCampaign()
  const level = 1 + Math.floor(xp / XP_PER_LEVEL)
  const xpIntoLevel = xp % XP_PER_LEVEL
  const completed = quests.filter((quest) => quest.status === 'completed')
  const activeQuestTitle = quests.find((quest) => quest.status === 'active')?.title ?? null

  // The two current quests have a strict prerequisite order, so reversing the
  // definition order is newest-first for the current chain. QuestSave does not
  // record completion timestamps; no invented dates/order are added.
  const recentQuests = [...completed].reverse().map((quest) => ({
    id: quest.id,
    title: quest.title,
    xpEarned: xpRewardForCompletedQuest(quest.id),
  }))

  return {
    xp,
    level,
    xpIntoLevel,
    xpPerLevel: XP_PER_LEVEL,
    levelProgressPercent: Math.round((xpIntoLevel / XP_PER_LEVEL) * 100),
    completedQuests: completed.length,
    totalQuests: quests.length,
    activeQuestTitle,
    finalMasteryGrade: campaign.finalMasteryGrade,
    questionsSeen: getSeenArrayQuizQuestionIds().length,
    topics: topicProgress(campaign),
    recentQuests,
    achievements: [
      {
        id: 'first-quest',
        title: 'First Quest',
        description: 'Complete your first quest.',
        unlocked: completed.length > 0,
      },
      { id: 'array-apprentice', title: 'Array Apprentice', description: 'Clear the array quiz.', unlocked: false },
      { id: 'stack-operator', title: 'Stack Operator', description: 'Complete the stack trial.', unlocked: false },
      { id: 'village-explorer', title: 'Village Explorer', description: 'Discover the village.', unlocked: false },
      { id: 'perfect-run', title: 'Perfect Run', description: 'Complete a challenge without mistakes.', unlocked: false },
      { id: 'dedicated-learner', title: 'Dedicated Learner', description: 'Keep learning over time.', unlocked: false },
    ],
  }
}
