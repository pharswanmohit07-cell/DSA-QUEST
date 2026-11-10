import { CAMPAIGN_TOPICS } from './campaignDefinitions'
import type { CampaignProgress, MasteryGrade } from './questTypes'

const GRADE_POINTS: Record<MasteryGrade, number> = {
  S: 5,
  A: 4,
  B: 3,
  C: 2,
  D: 1,
}

function assertCount(value: number, max: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > max) {
    throw new RangeError(`${label} must be an integer between 0 and ${max}`)
  }
}

export function gradeArrayQuiz(correctAnswers: number): MasteryGrade {
  assertCount(correctAnswers, 3, 'Correct answers')
  if (correctAnswers === 3) return 'S'
  if (correctAnswers === 2) return 'A'
  if (correctAnswers === 1) return 'B'
  return 'D'
}

export type InteractiveChallengeMetrics = {
  invalidActions: number
  hintsUsed: number
}

/**
 * Grades a completed campaign minigame using deterministic penalties.
 * Invalid actions cost one point; each consumed hint costs two points.
 * Failed or incomplete runs must not call this helper for a stored grade.
 */
export function gradeInteractiveChallenge(
  metrics: InteractiveChallengeMetrics,
): MasteryGrade {
  assertCount(metrics.invalidActions, Number.MAX_SAFE_INTEGER, 'Invalid actions')
  assertCount(metrics.hintsUsed, Number.MAX_SAFE_INTEGER, 'Hints used')

  const penaltyPoints = metrics.invalidActions + (2 * metrics.hintsUsed)
  if (!Number.isSafeInteger(penaltyPoints)) {
    throw new RangeError('Combined challenge penalty points must be a safe integer')
  }
  if (penaltyPoints === 0) return 'S'
  if (penaltyPoints <= 2) return 'A'
  if (penaltyPoints <= 4) return 'B'
  if (penaltyPoints <= 6) return 'C'
  return 'D'
}

export function gradeStackOperations(incorrectOperations: number): MasteryGrade {
  assertCount(incorrectOperations, Number.MAX_SAFE_INTEGER, 'Incorrect operations')
  if (incorrectOperations === 0) return 'S'
  if (incorrectOperations === 1) return 'A'
  if (incorrectOperations === 2) return 'B'
  if (incorrectOperations === 3) return 'C'
  return 'D'
}

export function gradePoints(grade: MasteryGrade): number {
  return GRADE_POINTS[grade]
}

export function finalGradeFromAverage(average: number): MasteryGrade {
  if (!Number.isFinite(average) || average < 1 || average > 5) {
    throw new RangeError('Average mastery points must be between 1 and 5')
  }
  if (average >= 4.5) return 'S'
  if (average >= 3.5) return 'A'
  if (average >= 2.5) return 'B'
  if (average >= 1.5) return 'C'
  return 'D'
}

export function calculateFinalMasteryGrade(
  campaign: Pick<CampaignProgress, 'topics'>,
): MasteryGrade | null {
  const grades: MasteryGrade[] = []
  for (const { id } of CAMPAIGN_TOPICS) {
    const progress = campaign.topics[id]
    if (progress.status !== 'completed' || progress.bestMasteryGrade === null) return null
    grades.push(progress.bestMasteryGrade)
  }

  const average = grades.reduce((sum, grade) => sum + gradePoints(grade), 0) / grades.length
  return finalGradeFromAverage(average)
}
