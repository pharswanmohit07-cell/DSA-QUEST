import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QuestManager } from './QuestManager'
import {
  clearNpcCampaignStages,
  getNpcCampaignStage,
  NPC_CAMPAIGN_STAGE_EVENT,
  NPC_CAMPAIGN_STAGES_STORAGE_KEY,
  setNpcCampaignStage,
} from './npcCampaignStages'

beforeEach(() => {
  localStorage.clear()
  clearNpcCampaignStages()
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  clearNpcCampaignStages()
})

describe('Stack and Queue campaign stage persistence', () => {
  it('starts both topics at Learn without changing campaign mastery', () => {
    expect(getNpcCampaignStage('stack-operations')).toBe('learn')
    expect(getNpcCampaignStage('queues')).toBe('learn')
    expect(QuestManager.getCampaign().topics['stack-operations'].status).toBe('locked')
    expect(QuestManager.getCampaign().topics.queues.status).toBe('locked')
  })

  it('persists Stack and Queue stages independently', () => {
    setNpcCampaignStage('stack-operations', 'practice')
    setNpcCampaignStage('queues', 'implement')

    expect(getNpcCampaignStage('stack-operations')).toBe('practice')
    expect(getNpcCampaignStage('queues')).toBe('implement')
    expect(JSON.parse(localStorage.getItem(NPC_CAMPAIGN_STAGES_STORAGE_KEY) ?? '{}')).toEqual({
      'stack-operations': 'practice',
      queues: 'implement',
    })
  })

  it('notifies QuestTracker whenever a stage changes', () => {
    const listener = vi.fn()
    window.addEventListener(NPC_CAMPAIGN_STAGE_EVENT, listener)

    setNpcCampaignStage('stack-operations', 'practice')
    setNpcCampaignStage('queues', 'implement')

    expect(listener).toHaveBeenCalledTimes(2)
    window.removeEventListener(NPC_CAMPAIGN_STAGE_EVENT, listener)
  })

  it('clears both stages with a new-campaign reset without clearing collectible scrolls', () => {
    setNpcCampaignStage('stack-operations', 'implement')
    setNpcCampaignStage('queues', 'practice')
    QuestManager.reset()

    expect(getNpcCampaignStage('stack-operations')).toBe('learn')
    expect(getNpcCampaignStage('queues')).toBe('learn')
    expect(localStorage.getItem(NPC_CAMPAIGN_STAGES_STORAGE_KEY)).toBeNull()
  })

  it('clears both stages through the persistent new-campaign clear-save path', () => {
    setNpcCampaignStage('stack-operations', 'implement')
    setNpcCampaignStage('queues', 'practice')

    expect(QuestManager.clearSave()).toBe(true)
    expect(getNpcCampaignStage('stack-operations')).toBe('learn')
    expect(getNpcCampaignStage('queues')).toBe('learn')
    expect(localStorage.getItem(NPC_CAMPAIGN_STAGES_STORAGE_KEY)).toBeNull()
  })

  it('falls back to Learn for an invalid persisted stage value', () => {
    localStorage.setItem(NPC_CAMPAIGN_STAGES_STORAGE_KEY, JSON.stringify({
      'stack-operations': 'unexpected',
      queues: 'implement',
    }))

    expect(getNpcCampaignStage('stack-operations')).toBe('learn')
    expect(getNpcCampaignStage('queues')).toBe('implement')
  })
})
