import type { CampaignTopicId } from './questTypes'
import type { RelicReward } from './relicInventory'

export const RELIC_REWARD_CLAIMED_EVENT = 'dsaq:relic-reward-claimed'

export type RelicRewardClaimDetail = {
  guardian: CampaignTopicId
  reward: RelicReward
}

export function dispatchRelicRewardClaimed(detail: RelicRewardClaimDetail): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<RelicRewardClaimDetail>(RELIC_REWARD_CLAIMED_EVENT, { detail }))
}
