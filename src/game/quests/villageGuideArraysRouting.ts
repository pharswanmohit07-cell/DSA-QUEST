import type { ArraysCampaignStage } from './arraysCampaignStages'
import type { CampaignTopicStatus, VillageTrainingRouteProgress } from './questTypes'
import {
  getVillageGuideRouteBranch,
  type VillageTrainingRouteGuideBranch,
} from './villageTrainingRouteRouting'

export type VillageGuideOpeningRoute =
  | 'arrays_locked'
  | 'village-guide-arrays'
  | 'array-manipulation-workshop'
  | 'array_scroll_offer'
  | 'array_scroll_collected'
  | VillageTrainingRouteGuideBranch

export type VillageGuideOpeningInput = {
  gateQuestCompleted: boolean
  arraysStatus: CampaignTopicStatus
  arraysStage: ArraysCampaignStage
  knowledgeScrollCollected: boolean
  scrollAcknowledged: boolean
  trainingRoute: VillageTrainingRouteProgress
  trainingRouteEligible: boolean
}

/** Pure routing for the connected Old Man → Guide → Arrays → Scroll sequence. */
export function getVillageGuideOpeningRoute(
  input: VillageGuideOpeningInput,
): VillageGuideOpeningRoute {
  if (!input.gateQuestCompleted || input.arraysStatus === 'locked') return 'arrays_locked'
  if (input.arraysStatus !== 'completed') {
    return input.arraysStage === 'implement'
      ? 'array-manipulation-workshop'
      : 'village-guide-arrays'
  }
  if (!input.knowledgeScrollCollected) return 'array_scroll_offer'
  if (!input.scrollAcknowledged) return 'array_scroll_collected'
  return getVillageGuideRouteBranch(input.trainingRoute, input.trainingRouteEligible)
}
