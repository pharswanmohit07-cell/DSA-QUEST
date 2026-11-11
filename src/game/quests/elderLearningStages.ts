/**
 * The Old Man's required prologue: LEARN -> PRACTICE -> GATE OPEN.
 *
 * The optional Knowledge Scroll quiz is deliberately not part of this state
 * machine. Legacy implementation/final-quiz markers migrate to complete so
 * returning players who already finished the earlier route keep their gate.
 */
export type ElderLearningStage = 'learn' | 'practice' | 'gate' | 'complete'

export const ELDER_LEARNING_STAGE_ORDER = ['learn', 'practice', 'gate'] as const
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
  if (prologueStage === 'learn' || prologueStage === 'practice' || prologueStage === 'gate') return prologueStage
  return 'learn'
}

/** True only for the immediate LEARN -> PRACTICE -> GATE -> COMPLETE transitions. */
export function isNextElderLearningStage(
  current: ElderLearningStage,
  candidate: ElderLearningStage,
): boolean {
  return (current === 'learn' && candidate === 'practice') ||
    (current === 'practice' && candidate === 'gate') ||
    (current === 'gate' && candidate === COMPLETED_ELDER_STAGE)
}

export function readElderPrologueStage(
  legacyChallengeCompleted = false,
): ElderLearningStage {
  if (legacyChallengeCompleted) return COMPLETED_ELDER_STAGE
  let stored: string | null = null
  try {
    stored = typeof window === 'undefined'
      ? null
      : window.localStorage.getItem(ELDER_PROLOGUE_STAGE_KEY)
  } catch {
    return deriveElderLearningStage(sessionStage, false)
  }
  return deriveElderLearningStage(stored ?? sessionStage, false)
}

/**
 * Persist only the immediate next stage. If storage is blocked, keep progress
 * in this page session rather than trapping the player in a completed lesson.
 */
export function writeElderPrologueStage(
  current: ElderLearningStage,
  candidate: ElderLearningStage,
): boolean {
  if (readElderPrologueStage(false) !== current ||
    !isNextElderLearningStage(current, candidate)) return false

  sessionStage = candidate
  try {
    if (typeof window === 'undefined') return true
    window.localStorage.setItem(ELDER_PROLOGUE_STAGE_KEY, candidate)
    return window.localStorage.getItem(ELDER_PROLOGUE_STAGE_KEY) === candidate
  } catch {
    return true
  }
}

export function clearElderPrologueStage(): boolean {
  sessionStage = null
  try {
    if (typeof window === 'undefined') return true
    window.localStorage.removeItem(ELDER_PROLOGUE_STAGE_KEY)
    return window.localStorage.getItem(ELDER_PROLOGUE_STAGE_KEY) === null
  } catch {
    return false
  }
}

export function advanceElderPrologueStageForChallenge(
  challengeId: string,
  completedSuccessfully: boolean,
  legacyChallengeCompleted: boolean,
): ElderLearningStage | null {
  if (!completedSuccessfully || legacyChallengeCompleted) return null

  const current = readElderPrologueStage(false)
  const expectedStage = challengeId === 'array-lesson'
    ? 'learn'
    : challengeId === 'array-quiz'
      ? 'practice'
      : challengeId === 'array-stack-operations'
        ? 'gate'
        : null
  if (expectedStage !== current) return null

  const next: ElderLearningStage = current === 'learn'
    ? 'practice'
    : current === 'practice'
      ? 'gate'
      : COMPLETED_ELDER_STAGE
  return writeElderPrologueStage(current, next) ? next : null
}
