import type { CampaignSnapshot } from './questTypes'
import type { VillageTrainingRouteProgress } from './questTypes'

export type VillageTrainingRouteEligibility =
  | 'eligible'
  | 'arrays-incomplete'
  | 'stack-operations-incomplete'

export type VillageTrainingRouteGuideBranch =
  | 'ambient'
  | 'route_offer'
  | 'route_active'
  | 'route_report'
  | 'route_completed'
  | 'route_not_eligible'

export type VillageTrainingRouteMonkBranch =
  | 'ambient'
  | 'lesson_intro'
  | 'lesson_reminder'
  | 'route_waiting_guide'
  | 'route_waiting_samurai'
  | 'route_waiting_return'
  | 'route_done'

export type VillageTrainingRouteSamuraiBranch =
  | 'ambient'
  | 'trial_before_offer'
  | 'trial_offer'
  | 'trial_not_ready_monk'
  | 'trial_already_passed'
  | 'route_done'

export type VillageTrainingRouteDialogueAction =
  | 'accept-route'
  | 'acknowledge-monk'
  | 'start-trial'
  | 'report-complete'

export type VillageTrainingRoutePersistenceNode =
  | 'route_offer_persistence_failed'
  | 'route_offer_recovery_required'
  | 'lesson_ack_persistence_failed'
  | 'lesson_ack_recovery_required'
  | 'trial_pass_persistence_failed'
  | 'trial_pass_recovery_required'
  | 'route_completion_persistence_failed'
  | 'route_completion_recovery_required'

/**
 * Eligibility is purely derived from campaign progress: both Arrays and Stack
 * Operations must be completed. The route itself never mutates the campaign.
 */
export function getVillageTrainingRouteEligibility(
  snapshot: Pick<CampaignSnapshot, 'topics'>,
): VillageTrainingRouteEligibility {
  const arrays = snapshot.topics.arrays?.status
  if (arrays !== 'completed') return 'arrays-incomplete'
  const stack = snapshot.topics['stack-operations']?.status
  if (stack !== 'completed') return 'stack-operations-incomplete'
  return 'eligible'
}

export function isVillageTrainingRouteEligible(
  snapshot: Pick<CampaignSnapshot, 'topics'>,
): boolean {
  return getVillageTrainingRouteEligibility(snapshot) === 'eligible'
}

/** Which dialogue node the Village Guide should open. */
export function getVillageGuideRouteBranch(
  route: VillageTrainingRouteProgress,
  eligible: boolean,
): VillageTrainingRouteGuideBranch {
  if (route.status === 'completed') return 'route_completed'
  if (route.status === 'active') {
    return route.stage === 'return-guide' ? 'route_report' : 'route_active'
  }
  return eligible ? 'route_offer' : 'route_not_eligible'
}

/** Which dialogue node the Monk should open. */
export function getVillageMonkRouteBranch(
  route: VillageTrainingRouteProgress,
): VillageTrainingRouteMonkBranch {
  if (route.status === 'not-started') return 'route_waiting_guide'
  if (route.status === 'completed') return 'route_done'
  switch (route.stage) {
    case 'visit-monk':
      return 'lesson_intro'
    case 'visit-samurai':
      return 'lesson_reminder'
    case 'return-guide':
      return 'route_waiting_return'
    default:
      return 'ambient'
  }
}

/** Which dialogue node the Samurai should open. */
export function getDojoSamuraiRouteBranch(
  route: VillageTrainingRouteProgress,
): VillageTrainingRouteSamuraiBranch {
  if (route.status === 'not-started') return 'trial_before_offer'
  if (route.status === 'completed') return 'route_done'
  switch (route.stage) {
    case 'visit-samurai':
      return 'trial_offer'
    case 'visit-monk':
      return 'trial_not_ready_monk'
    case 'return-guide':
      return 'trial_already_passed'
    default:
      return 'ambient'
  }
}

/**
 * Which Samurai dialogue node to open next, honouring a pending one-shot
 * persistence-feedback from the trial-pass path. When feedback is pending it
 * wins over the stage branch (the player must be told the pass was not
 * recorded) and is consumed; the stage remains visit-samurai, so the trial
 * offer stays available for the retry.
 */
export function getDojoSamuraiOpeningNode(
  route: VillageTrainingRouteProgress,
  pendingFeedback: VillageTrainingRoutePersistenceNode | null,
): VillageTrainingRouteSamuraiBranch | VillageTrainingRoutePersistenceNode {
  if (pendingFeedback) {
    return pendingFeedback
  }
  return getDojoSamuraiRouteBranch(route)
}

/** The side-quest action a Guide dialogue choice represents, or null. */
export function getVillageGuideDialogueAction(
  nodeId: string,
): VillageTrainingRouteDialogueAction | null {
  if (nodeId === 'route_accept_action') return 'accept-route'
  if (nodeId === 'route_report_action') return 'report-complete'
  return null
}

/** The side-quest action a Monk dialogue choice represents, or null. */
export function getVillageMonkDialogueAction(
  nodeId: string,
): VillageTrainingRouteDialogueAction | null {
  if (nodeId === 'lesson_ack_action') return 'acknowledge-monk'
  return null
}

/** The side-quest action a Samurai dialogue choice represents, or null. */
export function getDojoSamuraiDialogueAction(
  nodeId: string,
): VillageTrainingRouteDialogueAction | null {
  if (nodeId === 'trial_start_action') return 'start-trial'
  return null
}

/**
 * Maps a persistence failure result to the Guide node to show for the given
 * action; returns null for successes (success nodes are handled by the caller
 * because they differ per interaction).
 */
export function getVillageGuidePersistenceNode(
  action: VillageTrainingRouteDialogueAction,
  result: 'persistence-failed' | 'recovery-required',
): VillageTrainingRoutePersistenceNode | null {
  if (action === 'accept-route') {
    return result === 'persistence-failed'
      ? 'route_offer_persistence_failed'
      : 'route_offer_recovery_required'
  }
  if (action === 'report-complete') {
    return result === 'persistence-failed'
      ? 'route_completion_persistence_failed'
      : 'route_completion_recovery_required'
  }
  return null
}

export function getVillageMonkPersistenceNode(
  result: 'persistence-failed' | 'recovery-required',
): VillageTrainingRoutePersistenceNode | null {
  return result === 'persistence-failed'
    ? 'lesson_ack_persistence_failed'
    : 'lesson_ack_recovery_required'
}

export function getDojoSamuraiPersistenceNode(
  result: 'persistence-failed' | 'recovery-required',
): VillageTrainingRoutePersistenceNode | null {
  return result === 'persistence-failed'
    ? 'trial_pass_persistence_failed'
    : 'trial_pass_recovery_required'
}
