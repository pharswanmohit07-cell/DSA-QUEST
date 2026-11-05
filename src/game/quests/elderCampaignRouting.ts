import type {
  CampaignSnapshot,
  NorthernSnowfieldScoutingProgress,
  SideQuestCompletionResult,
  SideQuestStartResult,
} from './questTypes'

type ElderRoutingSnapshot = CampaignSnapshot & {
  northernSnowfieldScouting?: Pick<
    NorthernSnowfieldScoutingProgress,
    'status' | 'snowfieldVisited'
  >
}

export type ElderInteractionRoute =
  | 'dialogue'
  | 'array-quiz'
  | 'stack-practice'
  | 'quest-done'
  | 'northern-snowfield-reminder'
  | 'northern-snowfield-report'
  | 'northern-snowfield-completed'

export function getElderInteractionRoute(
  campaign: ElderRoutingSnapshot,
  legacyChallengeCompleted: boolean,
): ElderInteractionRoute {
  if (
    legacyChallengeCompleted ||
    campaign.topics['stack-operations'].status === 'completed'
  ) {
    const scouting = campaign.northernSnowfieldScouting
    if (scouting?.status === 'completed') return 'northern-snowfield-completed'
    if (scouting?.status === 'active') {
      return scouting.snowfieldVisited
        ? 'northern-snowfield-report'
        : 'northern-snowfield-reminder'
    }
    return 'quest-done'
  }
  if (campaign.topics.arrays.status === 'in-progress') return 'array-quiz'
  if (campaign.topics.arrays.status === 'completed') return 'stack-practice'
  return 'dialogue'
}

export type NorthernSnowfieldDialogueAction = 'accept' | 'report'

export type NorthernSnowfieldFeedbackNode =
  | 'northern_snowfield_accepted'
  | 'northern_snowfield_not_eligible'
  | 'northern_snowfield_persistence_failed'
  | 'northern_snowfield_recovery_required'
  | 'northern_snowfield_completed'
  | 'northern_snowfield_completion_not_eligible'
  | 'northern_snowfield_completion_persistence_failed'
  | 'northern_snowfield_completion_recovery_required'

export function getNorthernSnowfieldDialogueAction(
  nodeId: string,
): NorthernSnowfieldDialogueAction | null {
  if (nodeId === 'northern_snowfield_accept') return 'accept'
  if (nodeId === 'northern_snowfield_report_action') return 'report'
  return null
}

export function getNorthernSnowfieldFeedbackNode(
  action: NorthernSnowfieldDialogueAction,
  result: SideQuestStartResult | SideQuestCompletionResult,
): NorthernSnowfieldFeedbackNode {
  if (action === 'accept') {
    switch (result) {
      case 'started':
      case 'already-started':
        return 'northern_snowfield_accepted'
      case 'persistence-failed':
        return 'northern_snowfield_persistence_failed'
      case 'recovery-required':
        return 'northern_snowfield_recovery_required'
      case 'not-eligible':
      default:
        return 'northern_snowfield_not_eligible'
    }
  }

  switch (result) {
    case 'completed':
    case 'already-completed':
      return 'northern_snowfield_completed'
    case 'persistence-failed':
      return 'northern_snowfield_completion_persistence_failed'
    case 'recovery-required':
      return 'northern_snowfield_completion_recovery_required'
    case 'not-eligible':
    default:
      return 'northern_snowfield_completion_not_eligible'
  }
}
