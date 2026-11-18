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
  resetRelicCollectionCache,
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

  it('releases a reserved scroll when a challenge is abandoned', () => {
    acceptRelicCollectionQuest()
    claimEmptyScrolls()
    beginRelicTrial('queues', true)
    cancelRelicTrial('queues')
    expect(getRelicCollectionSnapshot().activeTrial).toBeNull()
    expect(getRelicCollectionSnapshot().emptyScrollsRemaining).toBe(7)
  })
})
