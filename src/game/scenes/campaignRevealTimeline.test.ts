import { describe, expect, it } from 'vitest'
import {
  CUTSCENE_JINGLE_DURATION_MS,
  getCampaignRevealTimeline,
} from './campaignRevealTimeline'

describe('campaign reveal cutscene timing', () => {
  it('fits the camera focus, hold, and return exactly inside the two-second cue', () => {
    const timeline = getCampaignRevealTimeline()

    expect(CUTSCENE_JINGLE_DURATION_MS).toBe(2000)
    expect(timeline.panMs).toBe(650)
    expect(timeline.holdMs).toBe(700)
    expect(timeline.returnMs).toBe(650)
    expect(timeline.panMs + timeline.holdMs + timeline.returnMs).toBe(CUTSCENE_JINGLE_DURATION_MS)
  })

  it('keeps all phases within a shorter supplied cue duration', () => {
    const timeline = getCampaignRevealTimeline(1200)

    expect(timeline.panMs + timeline.holdMs + timeline.returnMs).toBe(1200)
    expect(timeline.panMs).toBe(timeline.returnMs)
  })
})
