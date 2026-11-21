import { describe, expect, it } from 'vitest'
import { createInitialCampaignProgress } from './campaignDefinitions'
import { getMainCampaignBlocker } from './mainCampaignRouting'

describe('sequential guardian campaign routing', () => {
  it('holds each guardian behind the immediately preceding mastered guardian', () => {
    const topics = createInitialCampaignProgress().topics
    topics.arrays.status = 'completed'
    topics['stack-operations'].status = 'completed'

    expect(getMainCampaignBlocker('village-monk', true, topics)).toBe('south-farmer')

    topics.queues.status = 'completed'
    expect(getMainCampaignBlocker('plaza-merchant', true, topics)).toBe('village-monk')

    topics['linked-lists'].status = 'completed'
    expect(getMainCampaignBlocker('east-field-red-ninja', true, topics)).toBe('plaza-merchant')

    topics.searching.status = 'completed'
    expect(getMainCampaignBlocker('shrine-shaman', true, topics)).toBe('east-field-red-ninja')

    topics.sorting.status = 'completed'
    expect(getMainCampaignBlocker('shrine-shaman', true, topics)).toBeNull()
  })

  it('still requires the Old Man gate before any guardian', () => {
    const topics = createInitialCampaignProgress().topics
    expect(getMainCampaignBlocker('village-monk', false, topics)).toBe('elder-masanori')
  })
})
