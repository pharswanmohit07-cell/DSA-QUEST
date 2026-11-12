import { describe, expect, it } from 'vitest'
import { createInitialCampaignProgress } from './campaignDefinitions'
import {
  getElderInteractionRoute,
  getNorthernSnowfieldDialogueAction,
  getNorthernSnowfieldFeedbackNode,
} from './elderCampaignRouting'

describe('Elder campaign routing', () => {
  it('sends a new player directly to the gate trial', () => {
    const campaign = {
      ...createInitialCampaignProgress(),
      xp: 0,
    }

    expect(getElderInteractionRoute(campaign, false)).toBe('gate-trial')
  })

  it('sends an unfinished legacy quest directly to the gate trial', () => {
    const campaign = {
      ...createInitialCampaignProgress(),
      xp: 0,
    }

    expect(getElderInteractionRoute(campaign, false, true)).toBe('gate-trial')
    expect(campaign.topics.arrays.status).toBe('available')
  })

  it('keeps the gate trial independent of formal Arrays progress', () => {
    const progress = createInitialCampaignProgress()
    progress.topics.arrays.status = 'in-progress'
    progress.topics.arrays.attemptCount = 1
    const campaign = { ...progress, xp: 0 }

    expect(getElderInteractionRoute(campaign, false)).toBe('gate-trial')
  })

  it('routes a completed legacy challenge to the post-prologue acknowledgement', () => {
    const campaign = {
      ...createInitialCampaignProgress(),
      xp: 50,
    }

    expect(getElderInteractionRoute(campaign, true)).toBe('quest-done')
  })

  it('routes completed Stack Operations to the acknowledgement rou¶»§q«^