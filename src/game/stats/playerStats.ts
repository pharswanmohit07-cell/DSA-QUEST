import { challengeStore, getSeenArrayQuizQuestionIds } from '../challenge/challengeStore'
import { QuestManager, type QuestSave } from '../quests/QuestManager'
import type { QuestId, QuestRecord, QuestStatus } from '../quests/questTypes'

const PROFILE_KEY = 'dsaq-player-profile-v1'
const PROFILE_VERSION = 1

/** One level requires exactly 100 cumulative XP. Level 1 starts at 0 XP. */
const XP_PER_LEVEL = 100

export type PlayerProfile = {
  version: 1
  name: string
  /** Reserved for future visual customization; currently always empty. */
  appearance: Record<string, never>
}

export type TopicStatus = 'not-started' | 'in-progress' | 'done' | 'coming-soon'

export type TopicProgress = {
  id: string
  name: string
  status: TopicStatus
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

function normalizePlayerName(value: string): string {
  return value.trim().slice(0, 16) || 'Hero'
}

function defaultProfile(): PlayerProfile {
  return { version: PROFILE_VERSION, name: 'Hero', appearance: {} }
}

/** Read player name/profile; broken or unavailable browser storage falls back safely. */
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
      typeof parsed.name !== 'string'
    ) {
      return defaultProfile()
    }
    return { version: PROFILE_VERSION, name: normalizePlayerName(parsed.name), appearance: {} }
  } catch {
    return defaultProfile()
  }
}

/** Persist a trimmed, non-empty name (max 16 characters) without affecting quest saves. */
export function setPlayerName(name: string): PlayerProfile {
  const profile: PlayerProfile = {
    version: PROFILE_VERSION,
    name: normalizePlayerName(name),
    appearance: {},
  }
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
    } catch {
      // Profile personalization is optional and must never interrupt gameplay.
    }
  }
  return profile
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
  // The Elder's Summons has no XP award in MainScene. The save schema has no
  // per-quest history, so this uses only the rewards explicitly present in code.
  return id === 'array-sorting-challenge' ? 50 : 0
}

function topicProgress(quests: ReadonlyArray<QuestRecord>): TopicProgress[] {
  const mainQuest = quests.find((quest) => quest.id === 'array-sorting-challenge')
  const challenge = challengeStore.getSnapshot()
  const questCompleted = mainQuest?.status === 'completed'
  const arraysComplete = questCompleted ||
    challenge.quizStatus === 'passed' ||
    challenge.activeChallenge === 'array-stack-operations'
  const arraysStatus: TopicStatus = arraysComplete
    ? 'done'
    : mainQuest?.status === 'active'
      ? 'in-progress'
      : 'not-started'
  const stacksStatus: TopicStatus = questCompleted
    ? 'done'
    : challenge.activeChallenge === 'array-stack-operations'
      ? 'in-progress'
      : 'not-started'

  return [
    { id: 'arrays', name: 'Arrays', status: arraysStatus },
    { id: 'stack-operations', name: 'Stack Operations', status: stacksStatus },
    { id: 'queues', name: 'Queues', status: 'coming-soon' },
    { id: 'linked-lists', name: 'Linked Lists', status: 'coming-soon' },
    { id: 'searching', name: 'Searching', status: 'coming-soon' },
    { id: 'sorting', name: 'Sorting', status: 'coming-soon' },
    { id: 'trees', name: 'Trees', status: 'coming-soon' },
  ]
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
    questionsSeen: getSeenArrayQuizQuestionIds().length,
    topics: topicProgress(quests),
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
