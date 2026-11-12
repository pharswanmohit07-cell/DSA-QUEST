/**
 * The Old Man's only required campaign task is the gate-opening stack trial.
 *
 * Older saves may contain LEARN or PRACTICE stage markers from the retired
 * beginner Array tutorial. Those unfinished values now resume at the gate
 * trial; completed legacy saves keep their already-open gate.
 */
export type ElderLearningStage = 'gate' | 'complete'

export const ELDER_PROLOGUE_STAGE_ORDER = ['gate'] as const
export const COMPLETED_ELDER_STAGE: ElderLearningStage = 'complete'
const ELDER_PROLOGUE_STAGE_KEY = 'dsa-quest-elder-prologue-stage-v1'

let sessionStage: ElderLearningStage | null = null

export function deriveElderLearningStage(
  prologueStage: string | null | undefined,
  legacyChallengeCompleted: boolean,
): ElderLearningStage {
  if (legacyChallengeCompleted) return COMPLETED_ELDER_STAGE
  if (
    prologueStage === COMPLETED_ELDER_STAGE ||
    prologueStage === 'implementation' ||
    prologueStage === 'final-quiz'
  ) return COMPLETED_ELDER_STAGE
  return 'gate'
}

/** The gate trial is the only unfinished Elder stage. */
export function isNextElderLearningStage(
  current: ElderLearningStage,
  candidate: ElderLearningStage,
): boolean {
  return current === 'gate' && candidate === COMPLETED_ELDER_STAGE
}

export function readElderPrologueStage(
  legacyChallengeCompleted = false,
): ElderLearningStage {
  if (legacyChallengeCompleted) return COMPLETED_ELDER_STAGE
  let stored: string | null = null
  try {
    stored = typeof window === 'undefined'
      ? ¶»§q«^