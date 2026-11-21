import { describe, expect, it } from 'vitest'
import { createInitialCampaignProgress } from './campaignDefinitions'
import { getMainCampaignBlocker } from './mainCampaignRouting'

describe('sequential guardian campaign routing', () => {
  it('holds each later guardian behind the immediately preceding mastered guardian', () => {
    const topics = createInitialCampaignProgress().topics
    topics.arrays.status = 'completed'
    topics['stack-operations'].status = 'completed'
    topics.queues.status = 'completed'

    expect(getMainCampaignBlocker('village-monk' as never, true, topics)).toBe('south-farmer')

    topics['linked-lists'].status = 'completed'
    expect(getMainCampaignBlocker('plaza-merchant' as never, true, topics)).toBe('village-monk')

    topics.searching.status = 'completed'
    expect(getMainCampaignBlocker('east-field-red-ninja' as never, true, topics)).toBe('plaza-merchant')

    topics.sorting.status = 'completed'
    expect(getMainCampaignBlocker('shrine-shaman' as never, true, topics)).toBe('east-field-red-ninja')

    topics.trees.status = 'completed'
    expect(getMainCampaignBlocker('shrine-shaman' as never, true, topics)).toBeNull()
  })

  it('still requires the Old Man gate before any guardian', () => {
    const topics = createInitialCampaignProgress().topics
    expect(getMainCampaignBlocker('village-monk' as never, false, topics)).toBe('elder-masanori')
  })
})
