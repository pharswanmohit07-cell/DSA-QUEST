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

  it('offers the optional Queue Knowledge Scroll after Queue mastery until it is collected', () => {
    expect(getFarmerQueueOpeningRoute('completed', false)).toBe('queue_scroll_offer')
    expect(getFarmerQueueOpeningRoute('completed', true)).toBe('queue_done')
  })
})

describe('ordered main-campaign NPC routing', () => {
  it('directs every later NPC to the Elder until the gate opens', async () => {
    const routing = await import('./farmerQueueRouting')
    const resolve = (routing as unknown as {
      getMainCampaignBlocker?: (npcId: string, gateComplete: boolean, topics: unknown) => string | null
    }).getMainCampaignBlocker
    expect(typeof resolve).toBe('function')
    const { QuestManager } = await import('./QuestManager')
    QuestManager.reset()
    const campaign = QuestManager.getCampaign()
    expect(resolve?.('village-guide', false, campaign.topics)).toBe('elder-masanori')
    expect(resolve?.('dojo-samurai', false, campaign.topics)).toBe('elder-masanori')
    expect(resolve?.('south-farmer', false, campaign.topics)).toBe('elder-masanori')
  })

  it('directs Samurai and Farmer to the Guide until Arrays implementation is complete', async () => {
    const routing = await import('./farmerQueueRouting')
    const resolve = (routing as unknown as {
      getMainCampaignBlocker?: (npcId: string, gateComplete: boolean, topics: unknown) => string | null
    }).getMainCampaignBlocker
    expect(typeof resolve).toBe('function')
    const { QuestManager } = await import('./QuestManager')
    QuestManager.reset()
    const campaign = QuestManager.getCampaign()
    expect(resolve?.('village-guide', true, campaign.topics)).toBeNull()
    expect(resolve?.('dojo-samurai', true, campaign.topics)).toBe('village-guide')
    expect(resolve?.('south-farmer', true, campaign.topics)).toBe('village-guide')
  })

  it('directs Farmer to Samurai until Stack implementation is complete', async () => {
    const routing = await import('./farmerQueueRouting')
    const resolve = (routing as unknown as {
      getMainCampaignBlocker?: (npcId: string, gateComplete: boolean, topics: unknown) => string | null
    }).getMainCampaignBlocker
    expect(typeof resolve).toBe('function')
    const { QuestManager } = await import('./QuestManager')
    QuestManager.reset()
    expect(QuestManager.startTopic('arrays')).toBe(true)
    expect(QuestManager.completeTopic('arrays', {
      passed: true, masteryGrade: 'S', hintsUsed: 0,
    })).toBe(true)
    const campaign = QuestManager.getCampaign()
    expect(resolve?.('dojo-samurai', true, campaign.topics)).toBeNull()
    expect(resolve?.('south-farmer', true, campaign.topics)).toBe('dojo-samurai')
  })

  it('allows Farmer after Stack mastery and does not couple routing to Scroll ownership', async () => {
    const routing = await import('./farmerQueueRouting')
    const resolve = (routing as unknown as {
      getMainCampaignBlocker?: (npcId: string, gateComplete: boolean, topics: unknown) => string | null
    }).getMainCampaignBlocker
    expect(typeof resolve).toBe('function')
    const { QuestManager } = await import('./QuestManager')
    QuestManager.reset()
    expect(QuestManager.startTopic('arrays')).toBe(true)
    expect(QuestManager.completeTopic('arrays', {
      passed: true, masteryGrade: 'S', hintsUsed: 0,
    })).toBe(true)
    expect(QuestManager.startTopic('stack-operations')).toBe(true)
    expect(QuestManager.completeTopic('stack-operations', {
      passed: true, masteryGrade: 'S', hintsUsed: 0,
    })).toBe(true)
    const campaign = QuestManager.getCampaign()
    expect(resolve?.('south-farmer', true, campaign.topics)).toBeNull()
  })
})
