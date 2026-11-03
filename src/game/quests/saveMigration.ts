import { CAMPAIGN_TOPICS, createInitialCampaignProgress } from './campaignDefinitions'
import type {
  CampaignProgress,
  CampaignSave,
  CampaignTopicId,
  LegacyQuestSave,
  MasteryGrade,
  OpeningStoryStatus,
  QuestId,
  QuestStatus,
} from './questTypes'

const QUEST_IDS: readonly QuestId[] = ['speak-with-elder', 'array-sorting-challenge']
const QUEST_STATUSES: readonly QuestStatus[] = ['locked', 'active', 'completed', 'failed']
const TOPIC_STATUSES = ['locked', 'available', 'in-progress', 'completed'] as const
const MASTERY_GRADES: readonly MasteryGrade[] = ['S', 'A', 'B', 'C', 'D']
const OPENING_STORY_STATUSES: readonly OpeningStoryStatus[] = ['not-seen', 'completed', 'skipped']
const CAMPAIGN_TOPIC_IDS = new Set(CAMPAIGN_TOPICS.map((topic) => topic.id))
const RELIC_IDS = new Set(CAMPAIGN_TOPICS.map((topic) => topic.relicId))

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isQuestStatus(value: unknown): value is QuestStatus {
  return typeof value === 'string' && QUEST_STATUSES.includes(value as QuestStatus)
}

function isTopicId(value: unknown): value is CampaignTopicId {
  return typeof value === 'string' && CAMPAIGN_TOPIC_IDS.has(value as CampaignTopicId)
}

function isUniqueKnownIds<T extends string>(
  value: unknown,
  allowed: ReadonlySet<T>,
): value is T[] {
  return Array.isArray(value) &&
    value.every((item) => typeof item === 'string' && allowed.has(item as T)) &&
    new Set(value).size === value.length
}

function hasValidPosition(value: unknown): boolean {
  return isRecord(value) &&
    typeof value.x === 'number' && Number.isFinite(value.x) &&
    typeof value.y === 'number' && Number.isFinite(value.y)
}

export function isLegacyQuestSave(value: unknown): value is LegacyQuestSave {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    typeof value.savedAt !== 'number' ||
    !Number.isFinite(value.savedAt) ||
    !isRecord(value.quests) ||
    typeof value.xp !== 'number' ||
    !Number.isFinite(value.xp) ||
    value.xp < 0
  ) {
    return false
  }

  for (const id of QUEST_IDS) {
    const status = value.quests[id]
    if (status !== undefined && !isQuestStatus(status)) return false
  }
  return value.position === undefined || hasValidPosition(value.position)
}

export function isCampaignSave(value: unknown): value is CampaignSave {
  if (
    !isRecord(value) ||
    value.version !== 2 ||
    typeof value.savedAt !== 'number' ||
    !Number.isFinite(value.savedAt) ||
    !isRecord(value.quests) ||
    typeof value.xp !== 'number' ||
    !Number.isFinite(value.xp) ||
    value.xp < 0 ||
    (value.position !== undefined && !hasValidPosition(value.position)) ||
    (value.activeTopicId !== null && !isTopicId(value.activeTopicId)) ||
    !isRecord(value.topics) ||
    !isUniqueKnownIds(value.relicEntitlements, RELIC_IDS) ||
    !isUniqueKnownIds(value.firstCompletionRewardClaims, CAMPAIGN_TOPIC_IDS) ||
    !isQuestStatus(value.elderIntroductoryMilestone) ||
    !isRecord(value.openingStory) ||
    !OPENING_STORY_STATUSES.includes(value.openingStory.status as OpeningStoryStatus) ||
    (value.openingStory.storyVersion !== null && typeof value.openingStory.storyVersion !== 'string') ||
    !['not-started', 'completed'].includes(value.relicReturnStatus as string) ||
    !['not-started', 'completed'].includes(value.epilogueStatus as string)
  ) {
    return false
  }

  const rewardClaims = value.firstCompletionRewardClaims
  const relicEntitlements = value.relicEntitlements
  if (!Array.isArray(rewardClaims) || !Array.isArray(relicEntitlements)) return false

  for (const id of QUEST_IDS) {
    const status = value.quests[id]
    if (status !== undefined && !isQuestStatus(status)) return false
  }

  for (const topic of CAMPAIGN_TOPICS) {
    const progress = value.topics[topic.id]
    if (
      !isRecord(progress) ||
      !TOPIC_STATUSES.includes(progress.status as (typeof TOPIC_STATUSES)[number]) ||
      !Number.isInteger(progress.attemptCount) ||
      (progress.attemptCount as number) < 0 ||
      !Number.isInteger(progress.hintsUsed) ||
      (progress.hintsUsed as number) < 0 ||
      (progress.bestMasteryGrade !== null &&
        !MASTERY_GRADES.includes(progress.bestMasteryGrade as MasteryGrade))
    ) {
      return false
    }
    if (
      progress.status === 'completed' &&
      (
        !rewardClaims.includes(topic.id) ||
        !relicEntitlements.includes(topic.relicId)
      )
    ) {
      return false
    }
    if (progress.status === 'in-progress' && (progress.attemptCount as number) < 1) {
      return false
    }
  }

  const topics = value.topics as Record<CampaignTopicId, Record<string, unknown>>
  let firstIncompleteIndex = CAMPAIGN_TOPICS.length
  for (const [index, topic] of CAMPAIGN_TOPICS.entries()) {
    if (topics[topic.id].status !== 'completed') {
      firstIncompleteIndex = index
      break
    }
  }

  for (const [index, topic] of CAMPAIGN_TOPICS.entries()) {
    const status = topics[topic.id].status
    if (index < firstIncompleteIndex && status !== 'completed') return false
    if (index > firstIncompleteIndex && status !== 'locked') return false
    const lockedFirstTopic = index > 0 && status === 'locked'
    if (
      index === firstIncompleteIndex &&
      status !== 'available' &&
      status !== 'in-progress' &&
      !lockedFirstTopic
    ) {
      return false
    }
  }

  const completedTopicIds = CAMPAIGN_TOPICS
    .filter((topic) => topics[topic.id].status === 'completed')
    .map((topic) => topic.id)
  const completedRelicIds = CAMPAIGN_TOPICS
    .filter((topic) => topics[topic.id].status === 'completed')
    .map((topic) => topic.relicId)
  if (
    completedTopicIds.length !== rewardClaims.length ||
    completedTopicIds.some((id) => !rewardClaims.includes(id)) ||
    completedRelicIds.length !== relicEntitlements.length ||
    completedRelicIds.some((id) => !relicEntitlements.includes(id))
  ) {
    return false
  }

  const inProgressTopics = CAMPAIGN_TOPICS.filter(
    (topic) => topics[topic.id].status === 'in-progress',
  )
  if (inProgressTopics.length > 1) return false
  if (inProgressTopics.length === 1) {
    if (value.activeTopicId !== inProgressTopics[0].id) return false
  } else if (value.activeTopicId !== null) {
    const activeTopic = topics[value.activeTopicId as CampaignTopicId]
    if (
      !isRecord(activeTopic) ||
      activeTopic.status !== 'completed' ||
      (activeTopic.attemptCount as number) < 1
    ) {
      return false
    }
  }

  const allTopicsCompleted = firstIncompleteIndex === CAMPAIGN_TOPICS.length
  const allRelicsEntitled = completedRelicIds.length === RELIC_IDS.size
  if (
    value.relicReturnStatus === 'completed' &&
    (!allTopicsCompleted || !allRelicsEntitled)
  ) {
    return false
  }
  if (
    value.epilogueStatus === 'completed' &&
    (value.relicReturnStatus !== 'completed' || !allTopicsCompleted || !allRelicsEntitled)
  ) {
    return false
  }

  return true
}

function legacyQuestStatus(
  save: LegacyQuestSave,
  id: QuestId,
  fallback: QuestStatus,
): QuestStatus {
  return save.quests[id] ?? fallback
}

function cloneCampaign(progress: CampaignProgress): CampaignProgress {
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

/**
 * Converts a validated v1 save without touching browser storage or awarding XP.
 * Invalid and unsupported input returns null so callers can leave it untouched.
 */
export function migrateLegacySave(value: unknown): CampaignSave | null {
  if (!isLegacyQuestSave(value)) return null

  const arrayStackStatus = legacyQuestStatus(value, 'array-sorting-challenge', 'locked')
  const elderStatus = legacyQuestStatus(value, 'speak-with-elder', 'active')
  const campaign = createInitialCampaignProgress(elderStatus)
  const quests = {
    'speak-with-elder': elderStatus,
    'array-sorting-challenge': arrayStackStatus,
  }

  if (arrayStackStatus === 'completed') {
    campaign.topics.arrays.status = 'completed'
    campaign.topics['stack-operations'].status = 'completed'
    campaign.relicEntitlements = ['array-relic', 'stack-relic']
    campaign.firstCompletionRewardClaims = ['arrays', 'stack-operations']
  } else if (arrayStackStatus === 'active') {
    campaign.activeTopicId = 'arrays'
    campaign.topics.arrays.status = 'in-progress'
    campaign.topics.arrays.attemptCount = 1
  }

  campaign.openingStory = {
    status: 'completed',
    storyVersion: 'legacy-v1-migration',
  }

  return {
    version: 2,
    savedAt: value.savedAt,
    quests,
    xp: value.xp,
    ...(value.position ? { position: { ...value.position } } : {}),
    ...cloneCampaign(campaign),
  }
}
