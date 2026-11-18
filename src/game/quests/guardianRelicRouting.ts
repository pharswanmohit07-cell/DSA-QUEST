import type { GuardianCampaignTopicId } from '../challenge/challengeTypes'
import type { RelicTrialAccess } from './relicInventory'

export type LaterGuardianCampaignStatus = 'locked' | 'available' | 'in-progress' | 'completed'
export type LaterGuardianActionMode = 'mastery' | 'relic'

export type LaterGuardianRoute = {
  npcId: string
  topicId: GuardianCampaignTopicId
  prefix: string
}

export const LATER_GUARDIAN_ROUTES: readonly LaterGuardianRoute[] = [
  { npcId: 'village-monk', topicId: 'linked-lists', prefix: 'monk' },
  { npcId: 'plaza-merchant', topicId: 'searching', prefix: 'merchant' },
  { npcId: 'east-field-red-ninja', topicId: 'sorting', prefix: 'red_ninja' },
  { npcId: 'shrine-shaman', topicId: 'trees', prefix: 'shaman' },
]

export function getLaterGuardianRoute(npcId: string): LaterGuardianRoute | null {
  return LATER_GUARDIAN_ROUTES.find((route) => route.npcId === npcId) ?? null
}

/** Selects the next dialogue node for the four later guardians. */
export function getGuardianRelicDialogueRoute(
  npcId: string,
  status: LaterGuardianCampaignStatus,
  relicAccess?: RelicTrialAccess,
): { topicId: GuardianCampaignTopicId; nodeId: string } | null {
  const route = getLaterGuardianRoute(npcId)
  if (!route) return null

  if (status === 'locked') {
    return { topicId: route.topicId, nodeId: `${route.prefix}_campaign_locked` }
  }
  if (status === 'available' || status === 'in-progress') {
    return { topicId: route.topicId, nodeId: `${route.prefix}_campaign_offer` }
  }

  switch (relicAccess) {
    case 'quest-not-accepted':
      return { topicId: route.topicId, nodeId: `${route.prefix}_relic_quest_required` }
    case 'empty-scroll-required':
      return { topicId: route.topicId, nodeId: `${route.prefix}_empty_scroll_required` }
    case 'ready':
      return { topicId: route.topicId, nodeId: `${route.prefix}_relic_offer` }
    case 'reward-already-claimed':
      return { topicId: route.topicId, nodeId: `${route.prefix}_relic_claimed` }
    default:
      return null
  }
}

/** Resolves a dialogue choice to a campaign experience without scene-specific parsing. */
export function getGuardianRelicAction(
  nodeId: string,
): { topicId: GuardianCampaignTopicId; mode: LaterGuardianActionMode } | null {
  for (const route of LATER_GUARDIAN_ROUTES) {
    if (nodeId === `${route.prefix}_mastery_accept`) {
      return { topicId: route.topicId, mode: 'mastery' }
    }
    if (nodeId === `${route.prefix}_relic_accept`) {
      return { topicId: route.topicId, mode: 'relic' }
    }
  }
  return null
}
