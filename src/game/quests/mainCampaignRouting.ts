import { CAMPAIGN_TOPICS } from './campaignDefinitions'
import type { CampaignSnapshot, CampaignTopicId } from './questTypes'

export const CAMPAIGN_GUARDIAN_NPC_IDS: Record<CampaignTopicId, string> = {
  arrays: 'village-guide',
  'stack-operations': 'dojo-samurai',
  queues: 'south-farmer',
  'linked-lists': 'village-monk',
  searching: 'plaza-merchant',
  sorting: 'east-field-red-ninja',
  trees: 'shrine-shaman',
}

export type MainCampaignNpcId =
  | 'village-guide'
  | 'dojo-samurai'
  | 'south-farmer'
  | 'village-monk'
  | 'plaza-merchant'
  | 'east-field-red-ninja'
  | 'shrine-shaman'
export type MainCampaignBlockerNpcId = 'elder-masanori' | MainCampaignNpcId

export function getCampaignTopicForNpcId(npcId: string): CampaignTopicId | null {
  const match = Object.entries(CAMPAIGN_GUARDIAN_NPC_IDS).find(([, candidateId]) => candidateId === npcId)
  return match ? match[0] as CampaignTopicId : null
}

/**
 * Returns the earliest required guardian a player must visit before the
 * requested guardian may open its main activity. Optional relic collection
 * never changes the sequential learning campaign.
 */
export function getMainCampaignBlocker(
  npcId: string,
  gateQuestCompleted: boolean,
  topics: CampaignSnapshot['topics'],
): MainCampaignBlockerNpcId | null {
  const targetTopic = getCampaignTopicForNpcId(npcId)
  if (!targetTopic) return null
  if (!gateQuestCompleted) return 'elder-masanori'

  const targetIndex = CAMPAIGN_TOPICS.findIndex((topic) => topic.id === targetTopic)
  for (const requiredTopic of CAMPAIGN_TOPICS.slice(0, targetIndex)) {
    if (topics[requiredTopic.id].status !== 'completed') {
      return CAMPAIGN_GUARDIAN_NPC_IDS[requiredTopic.id] as MainCampaignNpcId
    }
  }
  return null
}