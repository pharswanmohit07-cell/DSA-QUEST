import { describe, expect, it } from 'vitest'
import { getVillageGuideOpeningRoute } from './villageGuideArraysRouting'
import { createDefaultVillageTrainingRouteProgress } from './questTypes'

const route = createDefaultVillageTrainingRouteProgress()

function input(overrides: Partial<Parameters<typeof getVillageGuideOpeningRoute>[0]> = {}) {
  return {
    gateQuestCompleted: true,
    arraysStatus: 'available' as const,
    arraysStage: 'learn' as const,
    knowledgeScrollCollected: false,
    scrollAcknowledged: false,
    trainingRoute: route,
    trainingRouteEligible: false,
    ...overrides,
  }
}

describe('Village Guide Arrays campaign routing', () => {
  it('keeps Arrays locked until the Old Man gate quest is complete', () => {
    expect(getVillageGuideOpeningRoute(input({ gateQuestCompleted: false }))).toBe('arrays_locked')
    expect(getVillageGuideOpeningRoute(input({ arraysStatus: 'locked' }))).toBe('arrays_locked')
  })

  it('resumes the lesson and practice stages with the Guide', () => {
    expect(getVillageGuideOpeningRoute(input({ arraysStage: 'learn' }))).toBe('village-guide-arrays')
    expect(getVillageGuideOpeningRoute(input({ arraysStatus: 'in-progress', arraysStage: 'practice' }))).toBe('village-guide-arrays')
  })

  it('opens the workshop only after all three practice questions are complete', () => {
    expect(getVillageGuideOpeningRoute(input({ arraysStatus: 'in-progress', arraysStage: 'implement' }))).toBe('array-manipulation-workshop')
  })

  it('offers the Scroll only after the formal Arrays topic is completed', () => {
    expect(getVillageGuideOpeningRoute(input({ arraysStatus: 'completed' }))).toBe('array_scroll_offer')
  })

  it('shows the collected acknowledgement only once before restoring existing route dialogue', () => {
    expect(getVillageGuideOpeningRoute(input({
      arraysStatus: 'completed',
      knowledgeScrollCollected: true,
      scrollAcknowledged: false,
    }))).toBe('array_scroll_collected')
    expect(getVillageGuideOpeningRoute(input({
      arraysStatus: 'completed',
      knowledgeScrollCollected: true,
      scrollAcknowledged: true,
    }))).toBe('route_not_eligible')
  })

  it('keeps the optional Village Training Route available after Arrays and Stack are mastered', () => {
    expect(getVillageGuideOpeningRoute(input({
      arraysStatus: 'completed',
      knowledgeScrollCollected: true,
      scrollAcknowledged: true,
      trainingRouteEligible: true,
    }))).toBe('route_offer')
  })
})
