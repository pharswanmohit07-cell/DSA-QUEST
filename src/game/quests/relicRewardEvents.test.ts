import { afterEach, describe, expect, it, vi } from 'vitest'
import { dispatchRelicRewardClaimed, RELIC_REWARD_CLAIMED_EVENT } from './relicRewardEvents'

afterEach(() => vi.restoreAllMocks())

describe('relic reward event', () => {
  it('publishes the exact guardian and assigned reward for the UI reveal', () => {
    const listener = vi.fn()
    window.addEventListener(RELIC_REWARD_CLAIMED_EVENT, listener)
    dispatchRelicRewardClaimed({ guardian: 'linked-lists', reward: 'plant-scroll' })
    window.removeEventListener(RELIC_REWARD_CLAIMED_EVENT, listener)
    expect(listener).toHaveBeenCalledOnce()
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({
      guardian: 'linked-lists',
      reward: 'plant-scroll',
    })
  })
})
