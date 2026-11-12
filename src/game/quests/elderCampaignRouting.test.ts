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

  it('routes completed Stack Operations to the acknowledgement route', () => {
    const progress = createInitialCampaignProgress()
    progress.topics.arrays.status = 'completed'
    progress.firstCompletionRewardClaims.push('arrays')
    progress.relicEntitlements.push('array-relic')
    progress.topics['stack-operations'].status = 'completed'
    progress.firstCompletionRewardClaims.push('stack-operations')
    progress.relicEntitlements.push('stack-relic')

    expect(getElderInteractionRoute({ ...progress, xp: 100 }, false)).toBe('quest-done')
  })

  it('keeps every completed-gate interaction on the one-line Village Guide handoff', () => {
    const progress = createInitialCampaignProgress()
    progress.topics.arrays.status = 'completed'
    progress.topics['stack-operations'].status = 'completed'
    const campaign = { ...progress, xp: 100 }

    const routeFor = (
      status: 'not-started' | 'active' | 'completed',
      snowfieldVisited: boolean,
    ) => {
      const withLegacyScoutingState = {
        ...campaign,
        northernSnowfieldScouting: {
          id: 'northern-snowfield-scouting' as const,
          status,
          snowfieldVisited,
        },
      }
      return getElderInteractionRoute(withLegacyScoutingState, false)
    }

    expect(routeFor('not-started', false)).toBe('quest-done')
    expect(routeFor('active', false)).toBe('quest-done')
    expect(routeFor('active', true)).toBe('quest-done')
    expect(routeFor('completed', true)).toBe('quest-done')
  })

  it('keeps side-quest dialogue gated while the lesson is still in progress', () => {
    const progress = createInitialCampaignProgress()
    progress.topics.arrays.status = 'in-progress'
    const campaign = {
      ...progress,
      xp: 0,
      northernSnowfieldScouting: {
        id: 'northern-snowfield-scouting' as const,
        status: 'active' as const,
        snowfieldVisited: true,
        rewardClaimed: false,
      },
    }

    expect(getElderInteractionRoute(campaign, false)).toBe('gate-trial')
  })

  it('only treats acceptance and report choices as state-changing actions', () => {
    expect(getNorthernSnowfieldDialogueAction('northern_snowfield_accept')).toBe('accept')
    expect(getNorthernSnowfieldDialogueAction('northern_snowfield_report_action')).toBe('report')
    expect(getNorthernSnowfieldDialogueAction('northern_snowfield_later')).toBeNull()
  })

  it('selects acceptance feedback only for persisted start outcomes', () => {
    expect(getNorthernSnowfieldFeedbackNode('accept', 'started')).toBe('northern_snowfield_accepted')
    expect(getNorthernSnowfieldFeedbackNode('accept', 'already-started')).toBe('northern_snowfield_accepted')
    expect(getNorthernSnowfieldFeedbackNode('accept', 'not-eligible')).toBe('northern_snowfield_not_eligible')
    expect(getNorthernSnowfieldFeedbackNode('accept', 'persistence-failed')).toBe('northern_snowfield_persistence_failed')
    expect(getNorthernSnowfieldFeedbackNode('accept', 'recovery-required')).toBe('northern_snowfield_recovery_required')
  })

  it('selects completion feedback only for confirmed completion outcomes', () => {
    expect(getNorthernSnowfieldFeedbackNode('report', 'completed')).toBe('northern_snowfield_completed')
    expect(getNorthernSnowfieldFeedbackNode('report', 'already-completed')).toBe('northern_snowfield_completed')
    expect(getNorthernSnowfieldFeedbackNode('report', 'not-eligible')).toBe('northern_snowfield_completion_not_eligible')
    expect(getNorthernSnowfieldFeedbackNode('report', 'persistence-failed')).toBe('northern_snowfield_completion_persistence_failed')
    expect(getNorthernSnowfieldFeedbackNode('report', 'recovery-required')).toBe('northern_snowfield_completion_recovery_required')
  })
})
