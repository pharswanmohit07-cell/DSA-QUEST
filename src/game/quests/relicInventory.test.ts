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
} from './relicInventory'

beforeEach(() => {
  localStorage.clear()
  clearRelicCollection()
  vi.restoreAllMocks()
})

describe('seven-guardian relic collection', () => {
  it('assigns each of the five elemental scrolls and two keys exactly once', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.37)
    expect(acceptRelicCollectionQuest()).toBe(true)

    const state = getRelicCollectionSnapshot()
    expect(Object.keys(state.assignments)).toHaveLength(7)
    expect(Object.values(state.assignments).sort()).toEqual([...RELIC_REWARDS].sort())
    expect(new Set(Object.values(state.assignments)).size).toBe(7)
    expect(JSON.parse(localStorage.getItem('dsa-quest-relic-collection-v1')!).assignments)
      .toEqual(state.assignments)
  })

  it('does not give blank scrolls until the player accepts the Old Man\'s quest', () => {
    expect(claimEmptyScrolls()).toBe('quest-not-accepted')
    expect(getRelicCollectionSnapshot().emptyScrollsRemaining).toBe(0)

    acceptRelicCollectionQuest()
    expect(claimEmptyScrolls()).toBe('claimed')
    expect(getRelicCollectionSnapshot().emptyScrollsRemaining).toBe(7)
    expect(claimEmptyScrolls()).toBe('already-claimed')
  })

  it('requires a mastered guardian and a blank scroll before opening a relic trial', () => {
    acceptRelicCollectionQuest()
    expect(getRelicTrialAccess('arrays', true)).toBe('empty-scroll-required')
    claimEmptyScrolls()

    expect(getRelicTrialAccess('arrays', false)).toBe('guardian-not-mastered')
    expect(beginRelicTrial('arrays', true)).toBe('ready')
    expect(beginRelicTrial('arrays', true)).toBe('trial-already-active')
    expect(getRelicTrialAccess('stack-operations', true)).toBe('another-trial-active')
  })

  it('does not consume a blank scroll on a failed trial, and supports retry', () => {
    acceptRelicCollectionQuest()
    claimEmptyScrolls()
    expect(beginRelicTrial('arrays', true)).toBe('ready')
    expect(finishRelicTrial('arrays', false)).toEqual({ status: 'failed' })
    expect(getRelicCollectionSnapshot().emptyScrollsRemaining).toBe(7)

    expect(beginRelicTrial('arrays', true)).toBe('ready')
    expect(finishRelicTrial('arrays', true)).toMatchObject({ status: 'awarded' })
    expect(getRelicCollectionSnapshot().emptyScrollsRemaining).toBe(6)
  })

  it('never grants a guardian reward twice and keeps the assignment after reload', () => {
    acceptRelicCollectionQuest()
    claimEmptyScrolls()
    const assigned = getRelicCollectionSnapshot().assignments.arrays
    beginRelicTrial('arrays', true)
    expect(finishRelicTrial('arrays', true)).toEqual({ status: 'awarded', reward: assigned })
    expect(getRelicTrialAccess('arrays', true)).toBe('reward-already-claimed')

    clearRelicCollection()
    const restored = getRelicCollectionSnapshot()
    expect(restored.assignments.arrays).toBe(assigned)
  })

  it('allows a reserved blank scroll to be released when a challenge is abandoned', () => {
    acceptRelicCollectionQuest()
    claimEmptyScrolls()
    beginRelicTrial('queues', true)
    cancelRelicTrial('queues')
    expect(getRelicCollectionSnapshot().activeTrial).toBeNull()
    expect(getRelicCollectionSnapshot().emptyScrollsRemaining).toBe(RELIC_GUARDIANS.length)
  })
})
