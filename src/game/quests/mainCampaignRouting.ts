import type { CampaignSnapshot } from './questTypes'

export type MainCampaignNpcId = 'village-guide' | 'dojo-samurai' | 'south-farmer'
export type MainCampaignBlockerNpcId = 'elder-masanori' | 'village-guide' | 'dojo-samurai'

/**
 * Returns the earliest required campaign NPC a player must visit before the
 * requested NPC may open its main activity. Scroll ownership is deliberately
 * excluded: it never changes main-campaign ordering.
 */
export function getMainCampaignBlocker(
  npcId: MainCampaignNpcId,
  gateQuestCompleted: boolean,
  topics: CampaignSnapshot['topics'],
): MainCampaignBlockerNpcId | null {
  if (!gateQuestCompleted) return 'elder-masanori'
  if (topics.arrays.status !== 'completed') {
    return npcId === 'village-guide' ? null : 'village-guide'
  }
  if (npcId === 'south-farmer' && topics['stack-operations'].status !== 'completed') {
    return 'dojo-samurai'
  }
  return null
}
