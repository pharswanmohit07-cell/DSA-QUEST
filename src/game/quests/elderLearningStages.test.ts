import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  COMPLETED_ELDER_STAGE,
  advanceElderPrologueStageForChallenge,
  clearElderPrologueStage,
  deriveElderLearningStage,
  isNextElderLearningStage,
  readElderPrologueStage,
  writeElderPrologueStage,
} from './elderLearningStages'
import { challengeStore } from '../challenge/challengeStore'
import { QuestManager } from './QuestManager'
import { resolveChallengeResumeOutcome } from '../challenge/challengeResumeRouting'
import { VILLAGE_NPCS } from '../npc/villageNpcs'
import { WORLD_NPCS } from '../npc/worldNpcs'
import { npcRegionForTile, isSnowfieldTile } from '../map/npcSafeAreas'
import { INTERACT_RADIUS } from '../npc/npcSelection'

describe('Old Man gate-only progression', () => {
  beforeEach(() => {
    window.localStorage.clear()
    clearElderPrologueStage()
    challengeStore.closeChallenge(false)
    QuestManager.reset()
  })

  it('routes new and unfinished legacy progress to the gate trial only', () => {
    expect(deriveElderLearningStage(undefined, false)).toBe('gate')
    expect(deriveElderLearningStage('learn', false)).toBe('gate')
    expect(deriveElderLearningStage('practice', false)).toBe('gate')
    expect(deriveElderLearningStage('gate', false)).toBe('gate')
    expect(deriveElderLearningStage('implementation', false)).toBe(COMPLETED_ELDER_STAGE)
    expect(deriveElderLearningStage('final-quiz', false)).toBe(COMPLETED_ELDER_STAGE)
    expect(deriveElderLearningStage('complete', fals¶»§q«^