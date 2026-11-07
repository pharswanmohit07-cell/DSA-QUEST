/**
 * Quest data model.
 *
 * A quest moves through `locked -> active -> completed | failed`. The manager
 * owns the transitions; this file only describes what a quest is.
 */

export type QuestStatus = 'locked' | 'active' | 'completed' | 'failed'

export type QuestId = 'speak-with-elder' | 'array-sorting-challenge'

export type CampaignTopicId =
  | 'arrays'
  | 'stack-operations'
  | 'queues'
  | 'linked-lists'
  | 'searching'
  | 'sorting'
  | 'trees'

export type CampaignTopicStatus = 'locked' | 'available' | 'in-progress' | 'completed'

export type MasteryGrade = 'S' | 'A' | 'B' | 'C' | 'D'

export type CampaignTopicDefinition = {
  id: CampaignTopicId
  displayName: string
  guardianRole: string
  prerequisite: CampaignTopicId | null
  relicId: string
  firstCompletionXp: 50
}

export type CampaignTopicProgress = {
  status: CampaignTopicStatus
  attemptCount: number
  hintsUsed: number
  bestMasteryGrade: MasteryGrade | null
}

export type OpeningStoryStatus = 'not-seen' | 'completed' | 'skipped'
export type CampaignMilestoneStatus = 'not-started' | 'completed'

export type CampaignProgress = {
  activeTopicId: CampaignTopicId | null
  topics: Record<CampaignTopicId, CampaignTopicProgress>
  relicEntitlements: string[]
  firstCompletionRewardClaims: CampaignTopicId[]
  finalMasteryGrade: MasteryGrade | null
  elderIntroductoryMilestone: QuestStatus
  openingStory: {
    status: OpeningStoryStatus
    storyVersion: string | null
  }
  relicReturnStatus: CampaignMilestoneStatus
  epilogueStatus: CampaignMilestoneStatus
}

export type PlayerPosition = { x: number; y: number }

export type NorthernSnowfieldScoutingStatus = 'not-started' | 'active' | 'completed'

export type NorthernSnowfieldScoutingProgress = {
  id: 'northern-snowfield-scouting'
  status: NorthernSnowfieldScoutingStatus
  snowfieldVisited: boolean
  rewardClaimed: boolean
}

export type SideQuestStartResult =
  | 'started'
  | 'already-started'
  | 'not-eligible'
  | 'persistence-failed'
  | 'recovery-required'

export type SideQuestVisitResult =
  | 'visited'
  | 'already-visited'
  | 'not-eligible'
  | 'persistence-failed'
  | 'recovery-required'

export type SideQuestCompletionResult =
  | 'completed'
  | 'already-completed'
  | 'not-eligible'
  | 'persistence-failed'
  | 'recovery-required'

/** Optional Village Training Route side quest: Guide -> Monk -> Samurai -> Guide. */
export type VillageTrainingRouteStatus = 'not-started' | 'active' | 'completed'

export type VillageTrainingRouteStage =
  | 'not-started'
  | 'visit-monk'
  | 'visit-samurai'
  | 'return-guide'
  | 'completed'

export type VillageTrainingRouteProgress = {
  id: 'village-training-route'
  status: VillageTrainingRouteStatus
  stage: VillageTrainingRouteStage
  rewardClaimed: boolean
}

export function createDefaultVillageTrainingRouteProgress(): VillageTrainingRouteProgress {
  return {
    id: 'village-training-route',
    status: 'not-started',
    stage: 'not-started',
    rewardClaimed: false,
  }
}

export function createDefaultNorthernSnowfieldScoutingProgress(): NorthernSnowfieldScoutingProgress {
  return {
    id: 'northern-snowfield-scouting',
    status: 'not-started',
    snowfieldVisited: false,
    rewardClaimed: false,
  }
}

/** Version 1 shape, retained only for validating and migrating old saves. */
export type LegacyQuestSave = {
  version: 1
  savedAt: number
  quests: Partial<Record<QuestId, QuestStatus>>
  xp: number
  position?: PlayerPosition
}

/** Version 2 campaign save, retained for migration and backup validation. */
export type CampaignSaveV2 = Omit<CampaignProgress, 'finalMasteryGrade'> & {
  version: 2
  savedAt: number
  quests: Partial<Record<QuestId, QuestStatus>>
  xp: number
  position?: PlayerPosition
}

type CampaignSaveV3Base = CampaignProgress & {
  version: 3
  savedAt: number
  quests: Partial<Record<QuestId, QuestStatus>>
  xp: number
  position?: PlayerPosition
  legacyCompletionXpCompensated: boolean
}

/** A V3 input may omit side-quest progress only for pre-feature saves. */
export type CampaignSaveV3Input = CampaignSaveV3Base & {
  northernSnowfieldScouting?: NorthernSnowfieldScoutingProgress
  villageTrainingRoute?: VillageTrainingRouteProgress
}

/** Normalized V3 runtime/save shape, including independent side-quest progress. */
export type CampaignSave = CampaignSaveV3Base & {
  northernSnowfieldScouting: NorthernSnowfieldScoutingProgress
  villageTrainingRoute: VillageTrainingRouteProgress
}

export type CampaignSnapshot = CampaignProgress & {
  xp: number
  position?: PlayerPosition
}

export type TopicCompletionResult = {
  passed: boolean
  masteryGrade: MasteryGrade
  hintsUsed: number
}

export type QuestDefinition = {
  id: QuestId
  title: string
  /** One-line objective shown in the tracker. */
  objective: string
  description: string
  /** Quests that must be `completed` before this one may be offered. */
  requires: QuestId[]
}

export type QuestRecord = QuestDefinition & {
  status: QuestStatus
}

export type QuestViewState = {
  /** Every quest with its current status, in definition order. */
  quests: QuestRecord[]
  /** The quest the player is currently on, if any. */
  activeQuest: QuestRecord | null
  /** The challenge the legacy code modal should be solving, if one is pending. */
  challenge: ChallengeId | null
  /** Latest outcome of a code submission, for the modal to render. */
  lastResult: ChallengeResult | null
  /** Player experience earned from completed challenges. */
  xp: number
  /** Independent optional side-quest state. */
  northernSnowfieldScouting: NorthernSnowfieldScoutingProgress
  /** Independent optional side-quest state for the Village Training Route. */
  villageTrainingRoute: VillageTrainingRouteProgress
}

export type ChallengeId = 'array-sorting'

export type ChallengeResult = {
  challengeId: ChallengeId
  passed: boolean
  /** Per-case feedback for the modal's output pane. */
  cases: ChallengeCaseResult[]
}

export type ChallengeCaseResult = {
  label: string
  passed: boolean
  /** What the player's code returned, or the error it threw. */
  actual: string
  expected: string
}
