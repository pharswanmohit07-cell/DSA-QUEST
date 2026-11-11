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
¶»§q«^