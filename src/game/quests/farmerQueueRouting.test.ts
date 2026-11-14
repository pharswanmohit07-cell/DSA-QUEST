import { describe, expect, it } from 'vitest'
import { getFarmerQueueOpeningRoute } from './farmerQueueRouting'

describe('Farmer Queue dialogue routing', () => {
  it('keeps the supply line locked until Stack Operations is completed', () => {
    expect(getFarmerQueueOpeningRoute('locked')).toBe('queue_locked')
  })

  it('uses the normal offer while the Queue topic is available or in progress', () => {
    expect(getFarmerQueueOpeningRoute('available')).toBeNull()
    expect(getFarmerQueueOpeningRoute('in-progress')).toBeNull()
  })

  it('acknowledges the restored supply route after Queue mastery is completed', () => {
    expect(getFarmerQueueOpeningRoute('completed')).toBe('queue_done')
  })
})
