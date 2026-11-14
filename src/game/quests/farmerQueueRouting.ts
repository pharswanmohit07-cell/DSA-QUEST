import type { CampaignTopicStatus } from './questTypes'

export type FarmerQueueOpeningRoute = 'queue_locked' | 'queue_done' | 'queue_scroll_offer' | null

export function getFarmerQueueOpeningRoute(
  status: CampaignTopicStatus,
  queueScrollCollected = true,
): FarmerQueueOpeningRoute {
  if (status === 'locked') return 'queue_locked'
  if (status === 'completed') return queueScrollCollected ? 'queue_done' : 'queue_scroll_offer'
  return null
}

export { getMainCampaignBlocker } from './mainCampaignRouting'
