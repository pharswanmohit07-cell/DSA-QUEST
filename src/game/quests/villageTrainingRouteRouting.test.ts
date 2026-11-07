import { beforeEach, describe, expect, it } from 'vitest'
import { QuestManager } from './QuestManager'
import {
  getDojoSamuraiDialogueAction,
  getDojoSamuraiOpeningNode,
  getDojoSamuraiPersistenceNode,
  getDojoSamuraiRouteBranch,
  getVillageGuideDialogueAction,
  getVillageGuidePersistenceNode,
  getVillageGuideRouteBranch,
  getVillageMonkDialogueAction,
  getVillageMonkPersistenceNode,
  getVillageMonkRouteBranch,
  getVillageTrainingRouteEligibility,
  isVillageTrainingRouteEligible,
} from './villageTrainingRouteRouting'
import { createDefaultVillageTrainingRouteProgress } from './questTypes'
import type { CampaignProgress, VillageTrainingRouteProgress } from './questTypes'

function progressAt(stage: VillageTrainingRouteProgress['stage']): VillageTrainingRouteProgress {
  if (stage === 'not-started') return createDefaultVillageTrainingRouteProgress()
  if (stage === 'completed') {
    return { id: 'village-training-route', status: 'completed', stage: 'completed', rewardClaimed: true }
  }
  return { id: 'village-training-route', status: 'active', stage, rewardClaimed: false }
}

function topicsWith(arrays: string, stack: string) {
  return {
    topics: {
      arrays: { status: arrays },
      'stack-operations': { status: stack },
    },
  } as unknown as Pick<CampaignProgress, 'topics'>
}

describe('Village Training Route eligibility', () => {
  it('is not eligible when arrays are incomplete', () => {
    expect(getVillageTrainingRouteEligibility(topicsWith('active', 'completed'))).toBe('arrays-incomplete')
    expect(getVillageTrainingRouteEligibility(topicsWith('locked', 'completed'))).toBe('arrays-incomplete')
    expect(isVillageTrainingRouteEligible(topicsWith('active', 'completed'))).toBe(false)
  })

  it('is not eligible when stack operations are incomplete', () => {
    expect(getVillageTrainingRouteEligibility(topicsWith('completed', 'active'))).toBe('stack-operations-incomplete')
    expect(isVillageTrainingRouteEligible(topicsWith('completed', 'locked'))).toBe(false)
  })

  it('is eligible only when both topics are completed', () => {
    expect(getVillageTrainingRouteEligibility(topicsWith('completed', 'completed'))).toBe('eligible')
    expect(isVillageTrainingRouteEligible(topicsWith('completed', 'completed'))).toBe(true)
  })
})

describe('Village Guide routing', () => {
  it('routes not-started players to the offer when eligible and to the ineligible line otherwise', () => {
    expect(getVillageGuideRouteBranch(progressAt('not-started'), true)).toBe('route_offer')
    expect(getVillageGuideRouteBranch(progressAt('not-started'), false)).toBe('route_not_eligible')
  })

  it('routes active players by stage', () => {
    expect(getVillageGuideRouteBranch(progressAt('visit-monk'), true)).toBe('route_active')
    expect(getVillageGuideRouteBranch(progressAt('visit-samurai'), true)).toBe('route_active')
    expect(getVillageGuideRouteBranch(progressAt('return-guide'), true)).toBe('route_report')
  })

  it('routes completed players to the acknowledgement', () => {
    expect(getVillageGuideRouteBranch(progressAt('completed'), true)).toBe('route_completed')
  })

  it('maps Guide choice nodes to actions and persistence nodes', () => {
    expect(getVillageGuideDialogueAction('route_accept_action')).toBe('accept-route')
    expect(getVillageGuideDialogueAction('route_report_action')).toBe('report-complete')
    expect(getVillageGuideDialogueAction('route_later')).toBeNull()
    expect(getVillageGuidePersistenceNode('accept-route', 'persistence-failed'))
      .toBe('route_offer_persistence_failed')
    expect(getVillageGuidePersistenceNode('accept-route', 'recovery-required'))
      .toBe('route_offer_recovery_required')
    expect(getVillageGuidePersistenceNode('report-complete', 'persistence-failed'))
      .toBe('route_completion_persistence_failed')
    expect(getVillageGuidePersistenceNode('report-complete', 'recovery-required'))
      .toBe('route_completion_recovery_required')
    expect(getVillageGuidePersistenceNode('acknowledge-monk', 'persistence-failed')).toBeNull()
  })
})

describe('Monk routing', () => {
  it('requires the Guide first when not started', () => {
    expect(getVillageMonkRouteBranch(progressAt('not-started'))).toBe('route_waiting_guide')
  })

  it('gives the lesson only at visit-monk and reminders afterwards', () => {
    expect(getVillageMonkRouteBranch(progressAt('visit-monk'))).toBe('lesson_intro')
    expect(getVillageMonkRouteBranch(progressAt('visit-samurai'))).toBe('lesson_reminder')
    expect(getVillageMonkRouteBranch(progressAt('return-guide'))).toBe('route_waiting_return')
    expect(getVillageMonkRouteBranch(progressAt('completed'))).toBe('route_done')
  })

  it('maps only the acknowledgement choice to an action', () => {
    expect(getVillageMonkDialogueAction('lesson_ack_action')).toBe('acknowledge-monk')
    expect(getVillageMonkDialogueAction('lesson_intro')).toBeNull()
    expect(getVillageMonkPersistenceNode('persistence-failed')).toBe('lesson_ack_persistence_failed')
    expect(getVillageMonkPersistenceNode('recovery-required')).toBe('lesson_ack_recovery_required')
  })
})

describe('display nodes never trigger persistence (Guide safety)', () => {
  beforeEach(() => {
    localStorage.clear()
    QuestManager.reset()
  })

  it('does not map the route_offer display node to an action', () => {
    expect(getVillageGuideDialogueAction('route_offer')).toBeNull()
    expect(getVillageGuideDialogueAction('route_not_eligible')).toBeNull()
    expect(getVillageGuideDialogueAction('route_active')).toBeNull()
  })

  it('does not map the route_report display node to an action', () => {
    expect(getVillageGuideDialogueAction('route_report')).toBeNull()
    expect(getVillageGuideDialogueAction('route_completed')).toBeNull()
  })

  it('maps only the explicit action nodes', () => {
    expect(getVillageGuideDialogueAction('route_accept_action')).toBe('accept-route')
    expect(getVillageGuideDialogueAction('route_report_action')).toBe('report-complete')
  })

  it('opening the Guide offer or report nodes awards no XP and changes no state', () => {
    const xpBefore = QuestManager.getSnapshot().xp
    const routeBefore = QuestManager.getSnapshot().villageTrainingRoute
    const campaignBefore = QuestManager.getCampaign()

    // Merely "opening" the display nodes must be a no-op.
    expect(getVillageGuideDialogueAction('route_offer')).toBeNull()
    expect(getVillageGuideDialogueAction('route_report')).toBeNull()

    expect(QuestManager.getSnapshot().xp).toBe(xpBefore)
    expect(QuestManager.getSnapshot().villageTrainingRoute).toEqual(routeBefore)
    expect(QuestManager.getCampaign().topics).toEqual(campaignBefore.topics)
  })
})

describe('Samurai routing', () => {
  it('offers the trial only at visit-samurai', () => {
    expect(getDojoSamuraiRouteBranch(progressAt('not-started'))).toBe('trial_before_offer')
    expect(getDojoSamuraiRouteBranch(progressAt('visit-monk'))).toBe('trial_not_ready_monk')
    expect(getDojoSamuraiRouteBranch(progressAt('visit-samurai'))).toBe('trial_offer')
    expect(getDojoSamuraiRouteBranch(progressAt('return-guide'))).toBe('trial_already_passed')
    expect(getDojoSamuraiRouteBranch(progressAt('completed'))).toBe('route_done')
  })

  it('maps only the trial-start choice to an action and persistence nodes', () => {
    expect(getDojoSamuraiDialogueAction('trial_start_action')).toBe('start-trial')
    expect(getDojoSamuraiDialogueAction('trial_offer')).toBeNull()
    expect(getDojoSamuraiPersistenceNode('persistence-failed')).toBe('trial_pass_persistence_failed')
    expect(getDojoSamuraiPersistenceNode('recovery-required')).toBe('trial_pass_recovery_required')
  })
})

describe('Samurai opening node with pending trial persistence feedback', () => {
  it('shows the persistence-failed node before the retry offer', () => {
    expect(getDojoSamuraiOpeningNode(progressAt('visit-samurai'), 'trial_pass_persistence_failed'))
      .toBe('trial_pass_persistence_failed')
  })

  it('shows the recovery-required node before the retry offer', () => {
    expect(getDojoSamuraiOpeningNode(progressAt('visit-samurai'), 'trial_pass_recovery_required'))
      .toBe('trial_pass_recovery_required')
  })

  it('falls back to the stage branch when no feedback is pending', () => {
    expect(getDojoSamuraiOpeningNode(progressAt('visit-samurai'), null)).toBe('trial_offer')
    expect(getDojoSamuraiOpeningNode(progressAt('visit-monk'), null)).toBe('trial_not_ready_monk')
  })

  it('keeps the stage at visit-samurai for a retry after unconfirmed feedback', () => {
    // The feedback node is a message, not a stage change: after showing it,
    // the route progress still points at the Samurai so the trial can be
    // retried (simulated here by feeding no pending feedback afterwards).
    expect(getDojoSamuraiOpeningNode(progressAt('visit-samurai'), 'trial_pass_persistence_failed'))
      .toBe('trial_pass_persistence_failed')
    expect(getDojoSamuraiOpeningNode(progressAt('visit-samurai'), null)).toBe('trial_offer')
  })
})
