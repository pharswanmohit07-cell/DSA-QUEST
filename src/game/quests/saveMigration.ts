import { CAMPAIGN_TOPICS, createInitialCampaignProgress } from './campaignDefinitions'
import { calculateFinalMasteryGrade } from './masteryGrading'
import type {
  CampaignProgress,
  CampaignSave,
  CampaignSaveV3Input,
  CampaignSaveV2,
  CampaignTopicId,
  LegacyQuestSave,
  MasteryGrade,
  NorthernSnowfieldScoutingProgress,
  VillageTrainingRouteProgress,
  OpeningStoryStatus,
  QuestId,
  QuestStatus,
} from './questTypes'
import { createDefaultNorthernSnowfieldScoutingProgress, createDefaultVillageTrainingRouteProgress } from './questTypes'

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

function isNorthernSnowfieldScoutingProgress(
  value: unknown,
): value is NorthernSnowfieldScoutingProgress {
  if (
    !isRecord(value) ||
    value.id !== 'northern-snowfield-scouting' ||
    !['not-started', 'active', 'completed'].includes(value.status as string) ||
    typeof value.snowfieldVisited !== 'boolean' ||
    typeof value.rewardClaimed !== 'boolean'
  ) {
    return false
  }

  return (
    (value.status === 'not-started' &&
      !value.snowfieldVisited &&
      !value.rewardClaimed) ||
    (value.status === 'active' && !value.rewardClaimed) ||
    (value.status === 'completed' &&
      value.snowfieldVisited &&
      value.rewardClaimed)
  )
}

function isVillageTrainingRouteProgress(
  value: unknown,
): value is VillageTrainingRouteProgress {
  if (
    !isRecord(value) ||
    value.id !== 'village-training-route' ||
    !['not-started', 'active', 'completed'].includes(value.status as string) ||
    !['not-started', 'visit-monk', 'visit-samurai', 'return-guide', 'completed'].includes(
      value.stage as string,
    ) ||
    typeof value.rewardClaimed !== 'boolean'
  ) {
    return false
  }

  return (
    (value.status === 'not-started' &&
      value.stage === 'not-started' &&
      !value.rewardClaimed) ||
    (value.status === 'active' &&
      ['visit-monk', 'visit-samurai', 'return-guide'].includes(value.stage as string) &&
      !value.rewardClaimed) ||
    (value.status === 'completed' &&
      value.stage === 'completed' &&
      value.rewardClaimed)
  )
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

export function isCampaignSaveV2(value: unknown): value is CampaignSaveV2 {
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

export function isCampaignSaveV3(value: unknown): value is CampaignSaveV3Input {
  if (
    !isRecord(value) ||
    value.version !== 3 ||
    typeof value.legacyCompletionXpCompensated !== 'boolean' ||
    (value.finalMasteryGrade !== null &&
      !MASTERY_GRADES.includes(value.finalMasteryGrade as MasteryGrade)) ||
    ('northernSnowfieldScouting' in value &&
      !isNorthernSnowfieldScoutingProgress(value.northernSnowfieldScouting)) ||
    ('villageTrainingRoute' in value &&
      !isVillageTrainingRouteProgress(value.villageTrainingRoute))
  ) {
    return false
  }

  const v2Shape = { ...value, version: 2 }
  if (!isCampaignSaveV2(v2Shape)) return false

  const legacyChallengeCompleted = v2Shape.quests['array-sorting-challenge'] === 'completed'
  // A V3 legacy quest now represents the independent Elder gate prologue. Old
  // saves that also completed Arrays/Stack keep those topic/reward records, but
  // a completed gate quest alone must not imply either campaign topic.
  if (value.legacyCompletionXpCompensated && !legacyChallengeCompleted) {
    return false
  }

  const finalGrade = value.finalMasteryGrade as MasteryGrade | null
  return finalGrade === calculateFinalMasteryGrade(v2Shape)
}

/** Normalizes a validated V3 input at the manager's save-loading boundary. */
export function normalizeCampaignSaveV3(value: unknown): CampaignSave | null {
  if (!isCampaignSaveV3(value)) return null
  const progress = reconcileCampaignRewardMarkers(value)
  const isInterruptedLegacyPrologue =
    value.quests['array-sorting-challenge'] === 'active' &&
    progress.activeTopicId === 'arrays' &&
    progress.topics.arrays.status === 'in-progress'
  if (isInterruptedLegacyPrologue) {
    progress.topics.arrays.status = 'available'
    progress.activeTopicId = null
  }
  return {
    ...value,
    ...progress,
    northernSnowfieldScouting: value.northernSnowfieldScouting
      ? { ...value.northernSnowfieldScouting }
      : createDefaultNorthernSnowfieldScoutingProgress(),
    villageTrainingRoute: value.villageTrainingRoute
      ? { ...value.villageTrainingRoute }
      : createDefaultVillageTrainingRouteProgress(),
  }
}

/** Backward-compatible validator for campaign saves from supported versions. */
export function isCampaignSave(value: unknown): value is CampaignSaveV3Input | CampaignSaveV2 {
  return isCampaignSaveV3(value) || isCampaignSaveV2(value)
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
 * Repairs only the paired first-completion markers. A marker is evidence that
 * the corresponding reward was already earned; it is not evidence that a topic
 * should be marked complete or that its prerequisites should be unlocked.
 * XP is deliberately left untouched so migration cannot double-award it.
 */
function reconcileCampaignRewardMarkers(progress: CampaignProgress): CampaignProgress {
  const reconciled = cloneCampaign(progress)
  for (const topic of CAMPAIGN_TOPICS) {
    const hasRewardEvidence =
      reconciled.topics[topic.id].status === 'completed' ||
      reconciled.firstCompletionRewardClaims.includes(topic.id) ||
      reconciled.relicEntitlements.includes(topic.relicId)
    if (!hasRewardEvidence) continue
    if (!reconciled.firstCompletionRewardClaims.includes(topic.id)) {
      reconciled.firstCompletionRewardClaims.push(topic.id)
    }
    if (!reconciled.relicEntitlements.includes(topic.relicId)) {
      reconciled.relicEntitlements.push(topic.relicId)
    }
  }
  return reconciled
}

/**
 * Converts a validated v1 save without touching browser storage or awarding XP.
 * Invalid and unsupported input returns null so callers can leave it untouched.
 */
export function migrateLegacySave(value: unknown): CampaignSaveV2 | null {
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
  }

  campaign.openingStory = {
    status: 'completed',
    storyVersion: 'legacy-v1-migration',
  }

  const reconciledCampaign = reconcileCampaignRewardMarkers(campaign)
  const { finalMasteryGrade: _finalMasteryGrade, ...campaignV2 } = cloneCampaign(reconciledCampaign)
  return {
    version: 2,
    savedAt: value.savedAt,
    quests,
    xp: value.xp,
    ...(value.position ? { position: { ...value.position } } : {}),
    ...campaignV2,
  }
}

export function migrateCampaignSave(value: unknown): CampaignSave | null {
  let v2Save: CampaignSaveV2 | null
  if (isLegacyQuestSave(value)) {
    v2Save = migrateLegacySave(value)
  } else {
    v2Save = isCampaignSaveV2(value) ? value : null
  }
  if (!v2Save) return null

  const progress = cloneCampaign({
    ...v2Save,
    finalMasteryGrade: null,
  })
  const legacyChallengeCompleted = v2Save.quests['array-sorting-challenge'] === 'completed'
  let xp = v2Save.xp
  let legacyCompletionXpCompensated = false

  if (legacyChallengeCompleted) {
    for (const id of ['arrays', 'stack-operations'] as const) {
      progress.topics[id].status = 'completed'
      if (!progress.firstCompletionRewardClaims.includes(id)) {
        progress.firstCompletionRewardClaims.push(id)
      }
    }
    for (const relicId of ['array-relic', 'stack-relic']) {
      if (!progress.relicEntitlements.includes(relicId)) {
        progress.relicEntitlements.push(relicId)
      }
    }
    if (progress.topics.queues.status === 'locked') {
      progress.topics.queues.status = 'available'
    }
    if (
      progress.activeTopicId === 'arrays' ||
      progress.activeTopicId === 'stack-operations'
    ) {
      progress.activeTopicId = null
    }
    xp += 50
    legacyCompletionXpCompensated = true
  } else if (
    v2Save.quests['array-sorting-challenge'] === 'active' &&
    progress.activeTopicId === 'arrays' &&
    progress.topics.arrays.status === 'in-progress'
  ) {
    // Earlier V3/V2 builds used the formal Arrays topic as a temporary marker
    // for the Elder's interrupted prologue. Return it to the Village Guide.
    progress.topics.arrays.status = 'available'
    progress.activeTopicId = null
  }

  const reconciledProgress = reconcileCampaignRewardMarkers(progress)
  reconciledProgress.finalMasteryGrade = calculateFinalMasteryGrade(reconciledProgress)
  return {
    ...reconciledProgress,
    version: 3,
    savedAt: v2Save.savedAt,
    quests: { ...v2Save.quests },
    xp,
    ...(v2Save.position ? { position: { ...v2Save.position } } : {}),
    legacyCompletionXpCompensated,
    northernSnowfieldScouting: createDefaultNorthernSnowfieldScoutingProgress(),
    villageTrainingRoute: createDefaultVillageTrainingRouteProgress(),
  }
}
