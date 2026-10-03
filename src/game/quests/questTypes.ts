/**
 * Quest data model.
 *
 * A quest moves through `locked -> active -> completed | failed`. The manager
 * owns the transitions; this file only describes what a quest is.
 */

export type QuestStatus = 'locked' | 'active' | 'completed' | 'failed'

export type QuestId = 'speak-with-elder' | 'array-sorting-challenge'

export type QuestDefinition = {
  id: QuestId
  title: string
  /** One-line objective shown in the tracker. */
  objective: string
  description: string
  /** Quests that must be `completed` before this one may be offered. */
  requires: QuestId[]
}

export type QuestRecord = QuestDefinition & {
  status: QuestStatus
}

export type QuestViewState = {
  /** Every quest with its current status, in definition order. */
  quests: QuestRecord[]
  /** The quest the player is currently on, if any. */
  activeQuest: QuestRecord | null
  /** The challenge the legacy code modal should be solving, if one is pending. */
  challenge: ChallengeId | null
  /** Latest outcome of a code submission, for the modal to render. */
  lastResult: ChallengeResult | null
  /** Player experience earned from completed challenges. */
  xp: number
}

export type ChallengeId = 'array-sorting'

export type ChallengeResult = {
  challengeId: ChallengeId
  passed: boolean
  /** Per-case feedback for the modal's output pane. */
  cases: ChallengeCaseResult[]
}

export type ChallengeCaseResult = {
  label: string
  passed: boolean
  /** What the player's code returned, or the error it threw. */
  actual: string
  expected: string
}
