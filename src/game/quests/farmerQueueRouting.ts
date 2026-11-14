import type { CampaignTopicStatus } from './questTypes'

export type FarmerQueueOpeningRoute = 'queue_locked' | 'queue_done' | null

export function getFarmerQueueOpeningRoute(status: CampaignTopicStatus): FarmerQueueOpeningRoute {
  if (status === 'locked') return 'queue_locked'
  if (status === 'completed') return 'queue_done'
  return null
}
