import { useSyncExternalStore } from 'react'
import type { CampaignTopicId } from './questTypes'

/**
 * The relic hunt is an optional story track, independent of campaign mastery.
 * Its seven rewards are assigned once and stored so an NPC never changes reward
 * when the page is refreshed or a player returns to the village.
 */
export const RELIC_GUARDIANS: readonly CampaignTopicId[] = [
  'arrays',
  'stack-operations',
  'queues',
  'linked-lists',
  'searching',
  'sorting',
  'trees',
]

export const RELIC_REWARDS = [
  'fire-scroll',
  'ice-scroll',
  'plant-scroll',
  'rock-scroll',
  'thunder-scroll',
  'gold-key',
  'silver-key',
] as const

export type RelicReward = (typeof RELIC_REWARDS)[number]

export type RelicCollectionState = {
  version: 1
  questAccepted: boolean
  emptyScrollsClaimed: boolean
  emptyScrollsRemaining: number
  assignments: Record<CampaignTopicId, RelicReward>
  claimedGuardians: CampaignTopicId[]
  activeTrial: CampaignTopicId | null
}

export type RelicTrialAccess =
  | 'quest-not-accepted'
  | 'guardian-not-mastered'
  | 'empty-scroll-required'
  | 'reward-already-claimed'
  | 'trial-already-active'
  | 'another-trial-active'
  | 'ready'

export type RelicRewardResult =
  | { status: 'not-active' }
  | { status: 'failed' }
  | { status: 'awarded'; reward: RelicReward }
  | { status: 'already-claimed'; reward: RelicReward }

export type EmptyScrollClaimResult =
  | 'quest-not-accepted'
  | 'claimed'
  | 'already-claimed'

const STORAGE_KEY = 'dsa-quest-relic-collection-v1'
const listeners = new Set<() => void>()

function shuffleRewards(random: () => number): Record<CampaignTopicId, RelicReward> {
  const rewards = [...RELIC_REWARDS]
  for (let index = rewards.length - 1; index > 0; index -= 1) {
    const sample = random()
    const swapIndex = Math.min(index, Math.max(0, Math.floor(sample * (index + 1))))
    ;[rewards[index], rewards[swapIndex]] = [rewards[swapIndex]!, rewards[index]!]
  }
  return Object.fromEntries(
    RELIC_GUARDIANS.map((guardian, index) => [guardian, rewards[index]]),
  ) as Record<CampaignTopicId, RelicReward>
}

function createInitialState(random: () => number = Math.random): RelicCollectionState {
  return {
    version: 1,
    questAccepted: false,
    emptyScrollsClaimed: false,
    emptyScrollsRemaining: 0,
    assignments: shuffleRewards(random),
    claimedGuardians: [],
    activeTrial: null,
  }
}

function isRelicReward(value: unknown): value is RelicReward {
  return typeof value === 'string' && (RELIC_REWARDS as readonly string[]).includes(value)
}

function isGuardian(value: unknown): value is CampaignTopicId {
  return typeof value === 'string' && (RELIC_GUARDIANS as readonly string[]).includes(value)
}

function parseState(value: unknown): RelicCollectionState | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<RelicCollectionState>
  if (
    candidate.version !== 1 ||
    typeof candidate.questAccepted !== 'boolean' ||
    typeof candidate.emptyScrollsClaimed !== 'boolean' ||
    !Number.isInteger(candidate.emptyScrollsRemaining) ||
    (candidate.emptyScrollsRemaining ?? -1) < 0 ||
    (candidate.emptyScrollsRemaining ?? 99) > RELIC_GUARDIANS.length ||
    !candidate.assignments ||
    !candidate.claimedGuardians ||
    !Array.isArray(candidate.claimedGuardians) ||
    (candidate.activeTrial !== null && !isGuardian(candidate.activeTrial))
  ) {
    return null
  }

  const assignments = {} as Record<CampaignTopicId, RelicReward>
  for (const guardian of RELIC_GUARDIANS) {
    const reward = (candidate.assignments as Record<string, unknown>)[guardian]
    if (!isRelicReward(reward)) return null
    assignments[guardian] = reward
  }
  if (new Set(Object.values(assignments)).size !== RELIC_REWARDS.length) return null

  const claimedGuardians = [...new Set(candidate.claimedGuardians.filter(isGuardian))]
  if (claimedGuardians.length !== candidate.claimedGuardians.length) return null

  return {
    version: 1,
    questAccepted: candidate.questAccepted,
    emptyScrollsClaimed: candidate.emptyScrollsClaimed,
    emptyScrollsRemaining: candidate.emptyScrollsRemaining,
    assignments,
    claimedGuardians,
    activeTrial: candidate.activeTrial,
  }
}

let cachedState: RelicCollectionState | null = null

function readState(): RelicCollectionState {
  if (cachedState) return cachedState
  try {
    const raw = typeof window === 'undefined'
      ? null
      : window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = parseState(JSON.parse(raw) as unknown)
      if (parsed) {
        cachedState = parsed
        return parsed
      }
    }
  } catch {
    // Keep a safe in-memory state when storage is unavailable or malformed.
  }
  cachedState = createInitialState()
  return cachedState
}

function publish(next: RelicCollectionState): void {
  cachedState = next
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    }
  } catch {
    // The current session still receives the earned item if browser storage is blocked.
  }
  for (const listener of [...listeners]) listener()
}

function copyState(state: RelicCollectionState): RelicCollectionState {
  return {
    ...state,
    assignments: { ...state.assignments },
    claimedGuardians: [...state.claimedGuardians],
  }
}

export function getRelicCollectionSnapshot(): RelicCollectionState {
  return copyState(readState())
}

export function subscribeToRelicCollection(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useRelicCollection(): RelicCollectionState {
  return useSyncExternalStore(
    subscribeToRelicCollection,
    getRelicCollectionSnapshot,
    getRelicCollectionSnapshot,
  )
}

/** Accepts the Old Man's hidden collection quest and locks the reward draw. */
export function acceptRelicCollectionQuest(): boolean {
  const state = readState()
  if (state.questAccepted) return false
  publish({ ...state, questAccepted: true })
  return true
}

/** The Old Man gives the set of blank scrolls only after the quest is accepted. */
export function claimEmptyScrolls(): EmptyScrollClaimResult {
  const state = readState()
  if (!state.questAccepted) return 'quest-not-accepted'
  if (state.emptyScrollsClaimed) return 'already-claimed'
  publish({
    ...state,
    emptyScrollsClaimed: true,
    emptyScrollsRemaining: RELIC_GUARDIANS.length,
  })
  return 'claimed'
}

export function getRelicTrialAccess(
  guardian: CampaignTopicId,
  guardianMastered: boolean,
): RelicTrialAccess {
  const state = readState()
  if (!state.questAccepted) return 'quest-not-accepted'
  if (!guardianMastered) return 'guardian-not-mastered'
  if (state.claimedGuardians.includes(guardian)) return 'reward-already-claimed'
  if (state.emptyScrollsRemaining <= 0) return 'empty-scroll-required'
  if (state.activeTrial === guardian) return 'trial-already-active'
  if (state.activeTrial !== null) return 'another-trial-active'
  return 'ready'
}

/** Reserves one blank scroll for this guardian without consuming it on failure. */
export function beginRelicTrial(
  guardian: CampaignTopicId,
  guardianMastered: boolean,
): RelicTrialAccess {
  const access = getRelicTrialAccess(guardian, guardianMastered)
  if (access !== 'ready') return access
  publish({ ...readState(), activeTrial: guardian })
  return 'ready'
}

export function cancelRelicTrial(guardian: CampaignTopicId): void {
  const state = readState()
  if (state.activeTrial !== guardian) return
  publish({ ...state, activeTrial: null })
}

/** Consumes a blank scroll and grants the guardian's fixed reward on success. */
export function finishRelicTrial(
  guardian: CampaignTopicId,
  passed: boolean,
): RelicRewardResult {
  const state = readState()
  if (state.activeTrial !== guardian) return { status: 'not-active' }
  if (!passed) {
    publish({ ...state, activeTrial: null })
    return { status: 'failed' }
  }
  const reward = state.assignments[guardian]
  if (state.claimedGuardians.includes(guardian)) {
    publish({ ...state, activeTrial: null })
    return { status: 'already-claimed', reward }
  }
  if (state.emptyScrollsRemaining <= 0) {
    publish({ ...state, activeTrial: null })
    return { status: 'not-active' }
  }
  publish({
    ...state,
    activeTrial: null,
    emptyScrollsRemaining: state.emptyScrollsRemaining - 1,
    claimedGuardians: [...state.claimedGuardians, guardian],
  })
  return { status: 'awarded', reward }
}

/** Test and explicit save-reset seam; ordinary gameplay never calls this. */
export function clearRelicCollection(): void {
  cachedState = null
  try {
    if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Clearing the session cache is still useful when storage is unavailable.
  }
  for (const listener of [...listeners]) listener()
}
