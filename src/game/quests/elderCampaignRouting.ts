import type {
  CampaignSnapshot,
  SideQuestCompletionResult,
  SideQuestStartResult,
} from './questTypes'

/**
 * The Elder has one required campaign route: the gate-opening stack trial.
 * Formal Arrays teaching and the optional Knowledge Scroll belong to the Guide.
 */
export type ElderInteractionRoute = 'gate-trial' | 'quest-done'

export function getElderInteractionRoute(
  campaign: CampaignSnapshot,
  legacyChallengeCompleted: boolean,
  // Accepted for call-site compatibility; a legacy active quest is an
  // interrupted prologue, never a reason to skip the lesson.
  _legacyChallengeActive = false,
): ElderInteractionRoute {
  if (
    legacyChallengeCompleted ||
    campaign.topics['stack-operations'].status === 'completed'
  ) {
    // The gate is the Old Man's only task. Every later interaction gives the
    // same one-line handoff to the Village Guide and then closes cleanly.
    return 'quest-done'
  }

  // Do not send players through the retired Elder Array lesson or practice.
  // The existing array-backed stack challenge is now the sole gate task.
  return 'gate-trial'
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
