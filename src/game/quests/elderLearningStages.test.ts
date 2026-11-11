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
    expect(isNextElderLearningStage('complete', 'learn')).toBe(false)
    expect(writeElderPrologueStage('learn', COMPLETED_ELDER_STAGE)).toBe(false)
  })

  it('starts interrupted progress back at its persisted stage, never ahead', () => {
    expect(deriveElderLearningStage('practice', false)).toBe('practice')
    expect(deriveElderLearningStage('gate', false)).toBe('gate')
    expect(deriveElderLearningStage('implementation', false)).toBe(COMPLETED_ELDER_STAGE)
    expect(deriveElderLearningStage('final-quiz', false)).toBe(COMPLETED_ELDER_STAGE)
    expect(deriveElderLearningStage('complete', false)).toBe(COMPLETED_ELDER_STAGE)
    // Unknown or absent values resume at LEARN.
    expect(deriveElderLearningStage(null, false)).toBe('learn')
    expect(deriveElderLearningStage('garbage', false)).toBe('learn')
  })

  it('clamps a completed legacy quest to the completed stage', () => {
    expect(deriveElderLearningStage('learn', true)).toBe(COMPLETED_ELDER_STAGE)
    expect(deriveElderLearningStage(undefined, true)).toBe(COMPLETED_ELDER_STAGE)
    expect(deriveElderLearningStage('complete', false)).toBe(COMPLETED_ELDER_STAGE)
  })

  it('persists and resumes an interrupted session without advancing', () => {
    expect(writeElderPrologueStage('learn', 'practice')).toBe(true)
    expect(readElderPrologueStage(false)).toBe('practice')

    expect(writeElderPrologueStage('practice', 'gate')).toBe(true)
    expect(readElderPrologueStage(false)).toBe('gate')
    expect(writeElderPrologueStage('gate', COMPLETED_ELDER_STAGE)).toBe(true)
    expect(readElderPrologueStage(false)).toBe(COMPLETED_ELDER_STAGE)
  })

  it('keeps valid progress in memory when storage reads and writes throw', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage quota')
    })

    expect(readElderPrologueStage(false)).toBe('learn')
    expect(writeElderPrologueStage('learn', 'practice')).toBe(true)
    expect(readElderPrologueStage(false)).toBe('practice')
    expect(writeElderPrologueStage('practice', 'gate')).toBe(true)
    expect(readElderPrologueStage(false)).toBe('gate')
    expect(writeElderPrologueStage('gate', COMPLETED_ELDER_STAGE)).toBe(true)
    expect(readElderPrologueStage(false)).toBe(COMPLETED_ELDER_STAGE)
  })

  it('rejects writes that do not start at the effective current stage', () => {
    expect(writeElderPrologueStage('practice', 'gate')).toBe(false)
    expect(writeElderPrologueStage('learn', 'practice')).toBe(true)
    expect(writeElderPrologueStage('learn', COMPLETED_ELDER_STAGE)).toBe(false)
    expect(readElderPrologueStage(false)).toBe('practice')
  })

  it('keeps a completed stage completed when the legacy quest flag is absent', () => {
    window.localStorage.setItem('dsa-quest-elder-prologue-stage-v1', 'complete')
    expect(readElderPrologueStage(false)).toBe(COMPLETED_ELDER_STAGE)
    expect(readElderPrologueStage(true)).toBe(COMPLETED_ELDER_STAGE)
  })

  it('clears separate prologue progress when the campaign save is cleared', () => {
    expect(writeElderPrologueStage('learn', 'practice')).toBe(true)
    expect(QuestManager.clearSave()).toBe(true)
    expect(readElderPrologueStage(false)).toBe('learn')
  })

  it('keeps the prologue out of the formal Arrays and Stack topics', () => {
    challengeStore.openChallenge('array-quiz', [])
    for (const question of challengeStore.getSnapshot().quizQuestions) {
      challengeStore.answerQuiz(question.correctAnswerIndex)
      challengeStore.advanceQuiz()
    }
    expect(challengeStore.getSnapshot().quizStatus).toBe('passed')
    expect(QuestManager.getCampaign().topics.arrays.status).toBe('available')
    expect(QuestManager.getCampaign().topics['stack-operations'].status).toBe('locked')
    expect(QuestManager.getCampaign().xp).toBe(0)
    expect(QuestManager.getCampaign().relicEntitlements).toEqual([])
  })
})

describe('Old Man gate puzzle stage (array-backed stack)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    clearElderPrologueStage()
    challengeStore.closeChallenge(false)
    QuestManager.reset()
  })

  it('opens the practice panel through the stack-operation store with array targets', () => {
    challengeStore.openChallenge('array-stack-operations', [
      { type: 'push', value: 4 },
      { type: 'push', value: 2 },
    ])
    const snapshot = challengeStore.getSnapshot()

    expect(snapshot.activeChallenge).toBe('array-stack-operations')
    expect(snapshot.targetOps).toEqual([
      { type: 'push', value: 4 },
      { type: 'push', value: 2 },
    ])
    // Practice exercises arrays through the stack panel; no queue state.
    expect(snapshot.currentQueue).toEqual([])
    expect(snapshot.quizStatus).toBe('idle')
  })

  it('requires the full operation sequence before practice reports success', () => {
    challengeStore.openChallenge('array-stack-operations', [{ type: 'push', value: 9 }])
    challengeStore.executeOp({ type: 'push', value: 9 })
    expect(challengeStore.getSnapshot().isComplete).toBe(true)
    challengeStore.closeChallenge(true)
    // The resume router must not treat practice success as gate completion.
    expect(resolveChallengeResumeOutcome('array-stack-operations', true)).toBe('none')
  })
})

describe('Elder required practice and optional Knowledge Scroll separation', () => {
  beforeEach(() => {
    window.localStorage.clear()
    clearElderPrologueStage()
    challengeStore.closeChallenge(false)
    QuestManager.reset()
  })

  it('keeps the practice quiz in the mandatory sequence and the coding Scroll outside it', () => {
    expect(resolveChallengeResumeOutcome('array-quiz', true)).toBe('none')
    expect(resolveChallengeResumeOutcome('array-quiz', false)).toBe('none')
    expect(resolveChallengeResumeOutcome('array-knowledge-scroll', true)).toBe('none')
    expect(resolveChallengeResumeOutcome('array-lesson', true)).toBe('none')
    expect(resolveChallengeResumeOutcome('array-stack-operations', true)).toBe('none')
    expect(advanceElderPrologueStageForChallenge('array-lesson', true, false)).toBe('practice')
    expect(advanceElderPrologueStageForChallenge('array-quiz', true, false)).toBe('gate')
    expect(advanceElderPrologueStageForChallenge('array-knowledge-scroll', true, false)).toBeNull()
  })

  it('does not advance the story or award a Scroll when the optional coding challenge is abandoned', () => {
    challengeStore.openChallenge('array-knowledge-scroll', [])
    challengeStore.closeChallenge(true)

    expect(readElderPrologueStage(false)).toBe('learn')
    expect(QuestManager.isCompleted('array-sorting-challenge')).toBe(false)
  })

  it('does not open the gate from the practice quiz by itself', () => {
    challengeStore.openChallenge('array-quiz', [])
    for (const question of challengeStore.getSnapshot().quizQuestions) {
      challengeStore.answerQuiz(question.correctAnswerIndex)
      challengeStore.advanceQuiz()
    }
    expect(challengeStore.getSnapshot().quizStatus).toBe('passed')
    expect(advanceElderPrologueStageForChallenge('array-stack-operations', true, false)).toBeNull()
    expect(QuestManager.isCompleted('array-sorting-challenge')).toBe(false)
  })
})

describe('Queue Farmer placement and interaction', () => {
  const farmer = VILLAGE_NPCS.find((npc) => npc.id === 'south-farmer')!

  it('has exactly one active quest-giving Farmer with id south-farmer', () => {
    const allFarmers = [...VILLAGE_NPCS, ...WORLD_NPCS].filter(
      (npc) => /farmer/i.test(npc.id) || npc.questTopic === 'queues',
    )
    expect(allFarmers.map((npc) => npc.id)).toEqual(['south-farmer'])
    expect(farmer.questTopic).toBe('queues')
  })

  it('keeps the northern Field Hand inactive', () => {
    expect(WORLD_NPCS.some((npc) => npc.id === 'north-field-farmer')).toBe(false)
  })

  it('spawns inside the central-plaza village region, never the snowfield', () => {
    expect(farmer.region).toBe('central-plaza')
    expect(npcRegionForTile(farmer.tileX, farmer.tileY)).toBe('central-plaza')
    expect(isSnowfieldTile(farmer.tileX, farmer.tileY)).toBe(false)
  })

  it('spawns genuinely within runtime interaction range of the player spawn', () => {
    // Same anchor math the scene uses: x=(tile+0.5)*16, y=(tile+1)*16.
    const playerSpawn = { x: 17.5 * 16, y: 25.5 * 16 }
    const farmerPos = { x: (farmer.tileX + 0.5) * 16, y: (farmer.tileY + 1) * 16 }
    const distance = Math.hypot(farmerPos.x - playerSpawn.x, farmerPos.y - playerSpawn.y)

    expect(distance).toBeLessThanOrEqual(INTERACT_RADIUS)
    // Safety margin: well inside the radius rather than on its edge.
    expect(distance).toBeLessThanOrEqual(INTERACT_RADIUS - 8)
  })

  it('patrols only within the central plaza on a short local leash', () => {
    expect(farmer.movement).toMatchObject({
      kind: 'local',
      region: 'village',
      band: 'central-plaza',
    })
    // 1.5 tiles of leash keeps him inside the plaza band.
    expect(farmer.movement && farmer.movement.kind === 'local' &&
      farmer.movement.leashRadiusTiles <= 2).toBe(true)
  })

  it('opens dialogue through E or Space from the first interaction frame', () => {
    // The scene selects the nearby NPC once per frame through the shared
    // selector; a spawn inside INTERACT_RADIUS means both the prompt and the
    // E/Space handler see the same Farmer from the player's first position.
    expect(farmer.dialogueTree.start.next).toBe('queue_offer')
    expect(farmer.dialogueTree.queue_offer.choices?.map((choice) => choice.next)).toEqual([
      'queue_accept',
      'queue_later',
    ])
  })
})
