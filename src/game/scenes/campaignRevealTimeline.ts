/**
 * LevelUp2.wav is 2,000 ms long (44.1 kHz, stereo, 16-bit PCM).
 * Keep the camera choreography inside that audible window.
 */
export const CUTSCENE_JINGLE_DURATION_MS = 2000

export type CampaignRevealTimeline = {
  panMs: number
  holdMs: number
  returnMs: number
}

export function getCampaignRevealTimeline(
  durationMs = CUTSCENE_JINGLE_DURATION_MS,
): CampaignRevealTimeline {
  const safeDuration = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0
  const panMs = Math.round(safeDuration * 0.325)
  const returnMs = panMs
  const holdMs = safeDuration - panMs - returnMs

  return { panMs, holdMs, returnMs }
}
