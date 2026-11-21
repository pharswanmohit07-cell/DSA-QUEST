import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  RELIC_GUARDIANS,
  RELIC_REWARDS,
  acceptRelicCollectionQuest,
  beginRelicTrial,
  cancelRelicTrial,
  claimEmptyScrolls,
  clearRelicCollection,
  finishRelicTrial,
  getRelicCollectionSnapshot,
  getRelicTrialAccess,
  hasPendingEmptyScrollReward,
  markEmptyScrollRewardSeen,
  resetRelicCollectionCache,
  returnRelicsToElder,
} from './relicInventory'

beforeEach(() => {
  localStorage.clear()
  clearRelicCollection()
  vi.restoreAllMocks()
})

describe('seven-guardian relic collection', () => {
  it('assigns five elemental scrolls and two keys exactly once', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.37)
    expect(acceptRelicCollectionQuest()).toBe(true)
    const state = getRelicCollectionSnapshot()
    expect(Object.keys(state.assignments)).toHaveLength(RELIC_GUARDIANS.length)
    expect(Object.values(state.assignments).sort()).toEqual([...RELIC_REWARDS].sort())
    expect(new Set(Object.values(state.assignments)).size).toBe(7)
    expect(JSON.parse(localStorage.getItem('dsa-quest-relic-collection-v1')!).assignments)
      .toEqual(state.assignments)
  })

  it('accepts the Old Man quest without granting the scroll until the handover is completed', () => {
    expect(acceptRelicCollectionQuest()).toBe(true)
    expect(getRelicCollectionSnapshot()).toMatchObject({
      questAccepted: true,
      emptyScrollsClaimed: false,
      emptyScrollsRemaining: 0,
    })
    expect(hasPendingEmptyScrollReward()).toBe(false)

    // The final Old Man dialogue panel calls claimEmptyScrolls after the player
    // confirms the handover, not when the quest choice is first selected.
    expect(claimEmptyScrolls()).toBe('claimed')
    expect(getRelicCollectionSnapshot().emptyScrollsRemaining).toBe(7)
    expect(hasPendingEmptyScrollReward()).toBe(true)
  })

  it('keeps the pickup reveal pending after handover until the player acknowledges it', () => {
    acceptRelicCollectionQuest()
    expect(claimEmptyScrolls()).toBe('claimed')
    expect(hasPendingEmptyScrollReward()).toBe(true)

    resetRelicCollectionCache()
    expect(hasPendingEmptyScrollReward()).toBe(true)
    expect(markEmptyScrollRewardSeen()).toBe(true)
    expect(hasPendingEmptyScrollReward()).toBe(false)

    resetRelicCollectionCache()
    expect(hasPendingEmptyScrollReward()).toBe(false)
  })

  it('recovers a previously claimed save whose old build never recorded the pickup reveal', () => {
    acceptRelicCollectionQuest()
    claimEmptyScrolls()
    const legacy = JSON.parse(localStorage.getItem('dsa-quest-relic-collection-v1')!)
    delete legacy.emptyScrollRewardSeen
    localStorage.setItem('dsa-quest-relic-collection-v1', JSON.stringify(legacy))
    resetRelicCollectionCache()

    expect(getRelicCollectionSnapshot().emptyScrollsRemaining).toBe(7)
    expect(hasPendingEmptyScrollReward()).toBe(true)
  })

  it('only gives the blank scrolls after the collection quest is accepted', () => {
    expect(claimEmptyScrolls()).toBe('quest-not-accepted')
    expect(getRelicCollectionSnapshot().emptyScrollsRemaining).toBe(0)
    acceptRelicCollectionQuest()
    expect(claimEmptyScrolls()).toBe('claimed')
    expect(getRelicCollectionSnapshot().emptyScrollsRemaining).toBe(7)
    expect(claimEmptyScrolls()).toBe('already-claimed')
  })

  it('requires both a mastered guardian and a blank scroll', () => {
    acceptRelicCollectionQuest()
    expect(getRelicTrialAccess('arrays', true)).toBe('empty-scroll-required')
    claimEmptyScrolls()
    expect(getRelicTrialAccess('arrays', false)).toBe('guardian-not-mastered')
    expect(beginRelicTrial('arrays', true)).toBe('ready')
    expect(beginRelicTrial('arrays', true)).toBe('trial-already-active')
    expect(getRelicTrialAccess('stack-operations', true)).toBe('another-trial-active')
  })

  it('does not consume a blank scroll on failure and allows retry', () => {
    acceptRelicCollectionQuest()
    claimEmptyScrolls()
    expect(beginRelicTrial('arrays', true)).toBe('ready')
    expect(finishRelicTrial('arrays', false)).toEqual({ status: 'failed' })
    expect(getRelicCollectionSnapshot().emptyScrollsRemaining).toBe(7)
    expect(beginRelicTrial('arrays', true)).toBe('ready')
    expect(finishRelicTrial('arrays', true)).toMatchObject({ status: 'awarded' })
    expect(getRelicCollectionSnapshot().emptyScrollsRemaining).toBe(6)
  })

  it('persists assignments and claims across a simulated reload', () => {
    acceptRelicCollectionQuest()
    claimEmptyScrolls()
    const assigned = getRelicCollectionSnapshot().assignments.arrays
    beginRelicTrial('arrays', true)
    expect(finishRelicTrial('arrays', true)).toEqual({ status: 'awarded', reward: assigned })
    expect(getRelicTrialAccess('arrays', true)).toBe('reward-already-claimed')
    resetRelicCollectionCache()
    const restored = getRelicCollectionSnapshot()
    expect(restored.assignments.arrays).toBe(assigned)
    expect(restored.claimedGuardians).toContain('arrays')
    expect(restored.emptyScrollsRemaining).toBe(6)
  })

  it('lets the Old Man receive all seven rewards exactly once', () => {
    expect(returnRelicsToElder()).toBe(false)
    acceptRelicCollectionQuest()
    claimEmptyScrolls()
    for (const guardian of RELIC_GUARDIANS) {
      expect(beginRelicTrial(guardian, true)).toBe('ready')
      expect(finishRelicTrial(guardian, true).status).toBe('awarded')
    }
    expect(returnRelicsToElder()).toBe(true)
    expect(getRelicCollectionSnapshot().relicsReturned).toBe(true)
    expect(returnRelicsToElder()).toBe(false)
    resetRelicCollectionCache()
    expect(getRelicCollectionSnapshot().relicsReturned).toBe(true)
  })

  it('releases a reserved scroll when a challenge is abandoned', () => {
    acceptRelicCollectionQuest()
    claimEmptyScrolls()
    beginRelicTrial('queues', true)
    cancelRelicTrial('queues')
    expect(getRelicCollectionSnapshot().activeTrial).toBeNull()
    expect(getRelicCollectionSnapshot().emptyScrollsRemaining).toBe(7)
  })
})
