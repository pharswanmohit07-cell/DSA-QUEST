import { describe, expect, it } from 'vitest'
import { createInitialCampaignProgress } from './campaignDefinitions'
import {
  getElderInteractionRoute,
  getNorthernSnowfieldDialogueAction,
  getNorthernSnowfieldFeedbackNode,
} from './elderCampaignRouting'

describe('Elder campaign routing', () => {
  it('keeps the existing introduction for a new Arrays player', () => {
    const campaign = {
      ...createInitialCampaignProgress(),
      xp: 0,
    }

    expect(getElderInteractionRoute(campaign, false)).toBe('dialogue')
  })

  it('retries an interrupted Arrays quiz without repeating the completed introduction', () => {
    const progress = createInitialCampaignProgress()
    progress.topics.arrays.status = 'in-progress'
    progress.topics.arrays.attemptCount = 1
    const campaign = { ...progress, xp: 0 }

    expect(getElderInteractionRoute(campaign, false)).toBe('array-quiz')
  })

  it('routes completed Arrays to Stack Practice and completed Stack to acknowledgement', () => {
    const progress = createInitialCampaignProgress()
    progress.topics.arrays.status = 'completed'
    progress.firstCompletionRewardClaims.push('arrays')
    progress.relicEntitlements.push('array-relic')
    progress.topics['stack-operations'].status = 'available'
    const campaign = { ...progress, xp: 50 }

    expect(getElderInteractionRoute(campaign, false)).toBe('stack-practice')

    progress.topics['stack-operations'].status = 'completed'
    progress.firstCompletionRewardClaims.push('stack-operations')
    progress.relicEntitlements.push('stack-relic')
    expect(getElderInteractionRoute({ ...progress, xp: 100 }, false)).toBe('quest-done')
  })

  it('preserves the legacy completed-quest acknowledgement route', () => {
    const campaign = {
      ...createInitialCampaignProgress(),
      xp: 50,
    }

    expect(getElderInteractionRoute(campaign, true)).toBe('quest-done')
  })

  it('routes each Northern Scouting Trip state only after Stack Practice is complete', () => {
    const progress = createInitialCampaignProgress()
    progress.topics.arrays.status = 'completed'
    progress.topics['stack-operations'].status = 'completed'
    const campaign = { ...progress, xp: 100 }

    const routeFor = (
      status: 'not-started' | 'active' | 'completed',
      snowfieldVisited: boolean,
    ) => getElderInteractionRoute({
      ...campaign,
      northernSnowfieldScouting: {
        status,
        snowfieldVisited,
      },
    }, false)

    expect(routeFor('not-started', false)).toBe('quest-done')
    expect(routeFor('active', false)).toBe('northern-snowfield-reminder')
    expect(routeFor('active', true)).toBe('northern-snowfield-report')
    expect(routeFor('completed', true)).toBe('northern-snowfield-completed')
  })

  it('keeps side-quest dialogue gated while the existing campaign route is incomplete', () => {
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

    expect(getElderInteractionRoute(campaign, false)).toBe('array-quiz')
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
