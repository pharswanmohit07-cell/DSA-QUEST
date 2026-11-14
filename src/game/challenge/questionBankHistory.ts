import type { DsaQuestionTopic } from './questionBank'

const HISTORY_KEYS: Record<DsaQuestionTopic, string> = {
  // Keep this key stable so existing Arrays progress is preserved.
  arrays: 'dsa-quest-array-quiz-history-v1',
  'stack-operations': 'dsa-quest-stack-quiz-history-v1',
  queues: 'dsa-quest-queue-quiz-history-v1',
}

/** Reads only this topic's completed question IDs. Storage failures are non-fatal. */
export function readTopicQuestionHistory(topicId: DsaQuestionTopic): string[] {
  if (typeof window === 'undefined') return []
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(HISTORY_KEYS[topicId]) ?? '[]')
    return Array.isArray(stored)
      ? [...new Set(stored.filter((id): id is string => typeof id === 'string' && id.length > 0))]
      : []
  } catch {
    return []
  }
}

/** Persists unique IDs only after a quiz reaches its terminal result. */
export function writeTopicQuestionHistory(topicId: DsaQuestionTopic, questionIds: readonly string[]): void {
  if (typeof window === 'undefined') return
  try {
    const uniqueIds = [...new Set(questionIds.filter((id) => typeof id === 'string' && id.length > 0))]
    window.localStorage.setItem(HISTORY_KEYS[topicId], JSON.stringify(uniqueIds))
  } catch {
    // If storage is unavailable, the quiz can still run for the current session.
  }
}
