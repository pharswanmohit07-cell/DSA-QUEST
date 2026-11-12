import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ARRAYS_CAMPAIGN_STAGE_EVENT,
  acknowledgeArraysScroll,
  hasAcknowledgedArraysScroll,
  clearArraysCampaignStage,
  getArraysCampaignStage,
  setArraysCampaignStage,
} from './arraysCampaignStages'

beforeEach(() => localStorage.clear())
afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('Village Guide Arrays campaign stage persistence', () => {
  it('starts at learn when no stage has been saved', () => {
    expect(getArraysCampaignStage()).toBe('learn')
  })

  it('persists the practice and implement stages between reads', () => {
    setArraysCampaignStage('practice')
    expect(getArraysCampaignStage()).toBe('practice')

    setArraysCampaignStage('implement')
    expect(getArraysCampaignStage()).toBe('implement')
    expect(localStorage.getItem('dsaq-arrays-campaign-stage-v1')).toBe('implement')
  })

  it('notifies QuestTracker when the stage changes', () => {
    const listener = vi.fn()
    window.addEventListener(ARRAYS_CAMPAIGN_STAGE_EVENT, listener)

    setArraysCampaignStage('practice')

    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener(ARRAYS_CAMPAIGN_STAGE_EVENT, listener)
  })

  it('clears the stage back to learn', () => {
    setArraysCampaignStage('complete')
    clearArraysCampaignStage()

    expect(getArraysCampaignStage()).toBe('learn')
    expect(localStorage.getItem('dsaq-arrays-campaign-stage-v1')).toBeNull()
  })
¶»§q«^