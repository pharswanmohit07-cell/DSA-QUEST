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
  relicReturnStatus: CampaignMilest¶»§q«^