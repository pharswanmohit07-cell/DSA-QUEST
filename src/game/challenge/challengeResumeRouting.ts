import type { ChallengeId } from '../challenge/challengeTypes'

/**
 * Decides what the scene should do when a challenge closes. This is the
 * regression gate that keeps the Samurai's trial from ever entering the
 * campaign completion path that unlocks the torii gate.
 *
 * - `campaign-complete`: the stack practice finished successfully; the scene
 *   runs the existing completeChallenge()/unlockGate() flow.
 * - `trial-pass`: the trial succeeded; the scene records only the side-quest
 *   stage advance via recordVillageTrainingTrialPass().
 * - `trial-fail`: the trial failed; the scene returns to the Samurai with no
 *   quest progress change.
 * - `none`: any other close (array quiz, cancelled challenges); the scene
 *   resumes play without quest mutation.
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
  if (challengeId === 'array-stack-operations' && completedSuccessfully) {
    return 'campaign-complete'
  }
  if (challengeId === 'village-training-trial') {
    return completedSuccessfully ? 'trial-pass' : 'trial-fail'
  }
  return 'none'
}
