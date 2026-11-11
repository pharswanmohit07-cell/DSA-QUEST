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

describe('Elder learning-first stage order', () => {
  beforeEach(() => {
    window.localStorage.clear()
    clearElderPrologueStage()
    challengeStore.closeChallenge(false)
    QuestManager.reset()
  })

  it('orders the required story stages LEARN -> PRACTICE -> GATE', () => {
    expect(deriveElderLearningStage(undefined, false)).toBe('learn')
    expect(isNextElderLearningStage('learn', 'practice')).toBe(true)
    expect(isNextElderLearningStage('practice', 'gate')).toBe(true)
    expect(isNextElderLearningStage('gate', COMPLETED_ELDER_STAGE)).toBe(true)
  })

  it('rejects skipping stages in either direction', () => {
    expect(isNextElderLearningStage('learn', COMPLETED_ELDER_STAGE)).toBe(false)
    expect(isNextElderLearningStage('complete', 'learn')).toBe(fals¶»§q«^