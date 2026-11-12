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
¶»§q«^