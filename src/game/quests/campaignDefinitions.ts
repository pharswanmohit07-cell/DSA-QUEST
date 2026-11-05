import type {
  CampaignProgress,
  CampaignTopicDefinition,
  CampaignTopicId,
  CampaignTopicProgress,
  QuestStatus,
} from './questTypes'

export const CAMPAIGN_TOPICS: readonly CampaignTopicDefinition[] = [
  {
    id: 'arrays',
    displayName: 'Arrays',
    guardianRole: 'Array Guardian',
    prerequisite: null,
    relicId: 'array-relic',
    firstCompletionXp: 50,
  },
  {
    id: 'stack-operations',
    displayName: 'Stack Operations',
    guardianRole: 'Stack Warden',
    prerequisite: 'arrays',
    relicId: 'stack-relic',
    firstCompletionXp: 50,
  },
  {
    id: 'queues',
    displayName: 'Queues',
    guardianRole: 'Queue Keeper',
    prerequisite: 'stack-operations',
    relicId: 'queue-relic',
    firstCompletionXp: 50,
  },
  {
    id: 'linked-lists',
    displayName: 'Linked Lists',
    guardianRole: 'Chain Guardian',
    prerequisite: 'queues',
    relicId: 'linked-list-relic',
    firstCompletionXp: 50,
  },
  {
    id: 'searching',
    displayName: 'Searching',
    guardianRole: 'Pathfinder',
    prerequisite: 'linked-lists',
    relicId: 'search-relic',
    firstCompletionXp: 50,
  },
  {
    id: 'sorting',
    displayName: 'Sorting',
    guardianRole: 'Order Keeper',
    prerequisite: 'searching',
    relicId: 'sorting-relic',
    firstCompletionXp: 50,
  },
  {
    id: 'trees',
    displayName: 'Trees',
    guardianRole: 'Tree Sentinel',
    prerequisite: 'sorting',
    relicId: 'tree-relic',
    firstCompletionXp: 50,
  },
]

export function createInitialCampaignProgress(
  elderIntroductoryMilestone: QuestStatus = 'active',
): CampaignProgress {
  const topics = {} as Record<CampaignTopicId, CampaignTopicProgress>
  for (const [index, topic] of CAMPAIGN_TOPICS.entries()) {
    topics[topic.id] = {
      status: index === 0 ? 'available' : 'locked',
      attemptCount: 0,
      hintsUsed: 0,
      bestMasteryGrade: null,
    }
  }

  return {
    activeTopicId: null,
    topics,
    relicEntitlements: [],
    firstCompletionRewardClaims: [],
    finalMasteryGrade: null,
    elderIntroductoryMilestone,
    openingStory: {
      status: 'not-seen',
      storyVersion: null,
    },
    relicReturnStatus: 'not-started',
    epilogueStatus: 'not-started',
  }
}
