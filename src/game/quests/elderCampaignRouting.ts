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

/**
 * The Elder interaction route. `array-lesson` covers the complete learning flow
 * (LEARN -> PRACTICE -> IMPLEMENT -> FINAL QUIZ); the lesson must never be
 * skipped because a legacy quest is active or the formal Arrays topic carries an
 * in-progress marker.
 */
export type ElderInteractionRoute =
  | 'array-lesson'
  | 'quest-done'
  | 'northern-snowfield-reminder'
  | 'northern-snowfield-report'
  | 'northern-snowfield-completed'

export function getElderInteractionRoute(
  campaign: ElderRoutingSnapshot,
  legacyChallengeCompleted: boolean,
  // Accepted for call-site compatibility; a legacy active quest is an
  // interrupted prologue, never a reason to skip the lesson.
  _legacyChallengeActive = false,
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

  // Learning first: every player who has not completed the prologue resumes
  // (or begins) the guided lesson. A legacy active-quest marker or an Arrays
  // in-progress marker must never bypass the LEARN stage; the scene resolves
  // the exact stage via `readElderPrologueStage` when it opens the lesson.
  return 'array-lesson'
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
