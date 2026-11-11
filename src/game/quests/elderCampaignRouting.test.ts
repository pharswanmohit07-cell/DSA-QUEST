import { describe, expect, it } from 'vitest'
import { createInitialCampaignProgress } from './campaignDefinitions'
import {
  getElderInteractionRoute,
  getNorthernSnowfieldDialogueAction,
  getNorthernSnowfieldFeedbackNode,
} from './elderCampaignRouting'

describe('Elder campaign routing', () => {
  it('keeps the complete lesson for a clean save', () => {
    const campaign = {
      ...createInitialCampaignProgress(),
      xp: 0,
    }

    expect(getElderInteractionRoute(campaign, false)).toBe('array-lesson')
  })

  it('never lets a legacy active quest skip the Array lesson', () => {
    const campaign = {
      ...createInitialCampaignProgress(),
      xp: 0,
    }

    expect(getElderInteractionRoute(campaign, false, true)).toBe('array-lesson')
    expect(campaign.topics.arrays.status).toBe('available')
  })

  it('never lets an Arrays in-progress marker skip the Array lesson', () => {
    const progress = createInitialCampaignProgress()
    progress.topics.arrays.status = 'in-progress'
    progress.topics.arrays.attemptCount = 1
    const campaign = { ...progress, xp: 0 }

    expect(getElderInteractionRoute(campaign, false)).toBe('array-lesson')
  })

  it('routes a completed legacy challenge to the post-prologue acknowledgement', () => {
    const campaign = {
      ...createInitialCampaignProgress(),
      xp: 50,
    }

    expect(getElderInteractionRoute(campaign, true)).toBe('quest-done')
  })

  it('routes completed Stack Operations to the acknowledgement ro¶»§q«^