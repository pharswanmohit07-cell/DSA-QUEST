import type { ChallengeId } from '../challenge/challengeTypes'

/**
 * Decides what the scene should do when a challenge closes.
 *
 * Required Elder story progression is owned by the LEARN -> PRACTICE stage
 * machine in MainScene. The Array quiz is an optional Knowledge Scroll reward
 * and deliberately never completes a campaign quest or opens the gate.
 *
 * - campaign-complete is retained as a legacy outcome label, but current
 *   Elder progression completes the gate directly after successful practice.
 * - trial-pass / trial-fail are reserved for the Samurai's side quest.
 * - none resumes play without changing story or campaign quest progress.
 */
export type ChallengeResumeOutcome =
  | 'campaign-complete'
  | 'trial-pass'
  | 'trial-fail'
  | 'none'

export function resolveChallengeResumeOutcome(
  challengeId: ChallengeId,
  completedSuccessfully: boolean,
): ChallengeResumeOutcome {
  if (challengeId === 'array-quiz' || challengeId === 'array-knowledge-scroll') {
    // The scene owns the practice transition; the optional trial is reward-only.
    return 'none'
  }
  if (challengeId === 'array-stack-operations' && completedSuccessfully) {
    // Gate-puzzle success is handled by the Elder prologue, not campaign routing.
    return 'none'
  }
  if (challengeId === 'village-training-trial') {
    return completedSuccessfully ? 'trial-pass' : 'trial-fail'
  }
  return 'none'
}
