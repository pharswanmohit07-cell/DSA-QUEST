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
    (current =¶»§q«^