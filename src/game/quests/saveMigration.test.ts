import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QuestManager } from './QuestManager'
import { isCampaignSave, migrateLegacySave } from './saveMigration'
import type { CampaignSave, LegacyQuestSave } from './questTypes'

const completedLegacySave: LegacyQuestSave = {
  version: 1,
  savedAt: 123,
  quests: {
    'speak-with-elder': 'completed',
    'array-sorting-challenge': 'completed',
  },
  xp: 137.5,
  position: { x: 282.25, y: 408.75 },
}

describe('version 1 save migration', () => {
  beforeEach(() => {
    localStorage.clear()
    QuestManager.reset()
  })

  it('splits a completed legacy Array/Stack quest and preserves both relics without awarding XP', () => {
    const migrated = migrateLegacySave(completedLegacySave)

    expect(migrated?.topics.arrays.status).toBe('completed')
    expect(migrated?.topics['stack-operations'].status).toBe('completed')
    expect(migrated?.topics.queues.status).toBe('locked')
    expect(migrated?.topics['linked-lists'].status).toBe('locked')
    expect(migrated?.topics.searching.status).toBe('locked')
    expect(migrated?.topics.sorting.status).toBe('locked')
    expect(migrated?.topics.trees.status).toBe('locked')
    expect(migrated?.relicEntitlements).toEqual(['array-relic', 'stack-relic'])
    expect(migrated?.firstCompletionRewardClaims).toEqual(['arrays', 'stack-operations'])
    expect(migrated?.xp).toBe(137.5)
  })

  it('maps an active combined quest to in-progress Arrays without assuming the quiz passed', () => {
    const migrated = migrateLegacySave({
      ...completedLegacySave,
      quests: {
        'speak-with-elder': 'active',
        'array-sorting-challenge': 'active',
      },
    })

    expect(migrated?.topics.arrays.status).toBe('in-progress')
    expect(migrated?.topics.arrays.attemptCount).toBe(1)
    expect(migrated?.topics['stack-operations'].status).toBe('locked')
    expect(migrated?.activeTopicId).toBe('arrays')
    expect(migrated?.relicEntitlements).toEqual([])
    expect(migrated?.xp).toBe(completedLegacySave.xp)
    expect(migrated?.position).toEqual(completedLegacySave.position)
    expect(migrated?.elderIntroductoryMilestone).toBe('active')
    expect(isCampaignSave(migrated)).toBe(true)
  })

  it('makes Arrays available when the combined quest is locked or not started', () => {
    const migrated = migrateLegacySave({
      ...completedLegacySave,
      quests: { 'speak-with-elder': 'active', 'array-sorting-challenge': 'locked' },
    })

    expect(migrated?.topics.arrays.status).toBe('available')
    expect(migrated?.topics['stack-operations'].status).toBe('locked')
    expect(migrated?.activeTopicId).toBeNull()
  })

  it('preserves the Elder milestone, exact XP, and exact saved coordinates', () => {
    const migrated = migrateLegacySave(completedLegacySave)

    expect(migrated?.elderIntroductoryMilestone).toBe('completed')
    expect(migrated?.xp).toBe(completedLegacySave.xp)
    expect(migrated?.position).toEqual(completedLegacySave.position)
  })

  it('marks existing players as having already seen the opening story', () => {
    const migrated = migrateLegacySave(completedLegacySave)

    expect(migrated?.openingStory.status).toBe('completed')
  })

  it('rejects malformed or unsupported legacy saves', () => {
    expect(migrateLegacySave({ version: 99 })).toBeNull()
    expect(migrateLegacySave({ ...completedLegacySave, xp: Number.NaN })).toBeNull()
    expect(migrateLegacySave({ ...completedLegacySave, position: { x: 1, y: Number.POSITIVE_INFINITY } })).toBeNull()
  })

  it('rejects completed topics when an earlier prerequisite is incomplete', () => {
    const impossible = migrateLegacySave({
      ...completedLegacySave,
      quests: { 'speak-with-elder': 'completed', 'array-sorting-challenge': 'locked' },
    })!
    impossible.topics['linked-lists'].status = 'completed'
    impossible.firstCompletionRewardClaims.push('linked-lists')
    impossible.relicEntitlements.push('linked-list-relic')

    expect(isCampaignSave(impossible)).toBe(false)
  })

  it('rejects active topic identifiers that do not match the in-progress topic', () => {
    const impossible = migrateLegacySave(completedLegacySave)!
    impossible.topics.queues.status = 'in-progress'
    impossible.activeTopicId = 'linked-lists'

    expect(isCampaignSave(impossible)).toBe(false)
  })

  it('rejects active topic IDs whose topic is not in-progress or a completed replay', () => {
    const impossible = migrateLegacySave({
      ...completedLegacySave,
      quests: { 'speak-with-elder': 'active', 'array-sorting-challenge': 'locked' },
    })!
    impossible.activeTopicId = 'arrays'

    expect(isCampaignSave(impossible)).toBe(false)
  })

  it('rejects an in-progress topic with zero recorded attempts', () => {
    const impossible = migrateLegacySave({
      ...completedLegacySave,
      quests: { 'speak-with-elder': 'active', 'array-sorting-challenge': 'locked' },
    })!
    impossible.topics.arrays.status = 'in-progress'
    impossible.activeTopicId = 'arrays'

    expect(isCampaignSave(impossible)).toBe(false)
  })

  it('accepts an in-progress topic with a recorded attempt', () => {
    const activeLegacy: LegacyQuestSave = {
      ...completedLegacySave,
      quests: { 'speak-with-elder': 'active', 'array-sorting-challenge': 'active' },
    }
    const inProgress = migrateLegacySave(activeLegacy)

    expect(inProgress?.topics.arrays.status).toBe('in-progress')
    expect(inProgress?.topics.arrays.attemptCount).toBeGreaterThan(0)
    expect(isCampaignSave(inProgress)).toBe(true)
  })

  it('rejects Arrays locked in an otherwise valid initial campaign save', () => {
    const initial = migrateLegacySave({
      ...completedLegacySave,
      quests: { 'speak-with-elder': 'active', 'array-sorting-challenge': 'locked' },
    })!
    initial.topics.arrays.status = 'locked'

    expect(isCampaignSave(initial)).toBe(false)
  })

  it('rejects a completed relic-return ceremony without all legitimate relics', () => {
    const impossible = migrateLegacySave(completedLegacySave)!
    impossible.relicReturnStatus = 'completed'

    expect(isCampaignSave(impossible)).toBe(false)
  })

  it('rejects campaign completion before the relic-return milestone', () => {
    const impossible = migrateLegacySave(completedLegacySave)!
    impossible.epilogueStatus = 'completed'

    expect(isCampaignSave(impossible)).toBe(false)
  })

  it('does not overwrite an existing valid v2 save with a malformed v1 save', () => {
    const existing: CampaignSave = {
      ...migrateLegacySave(completedLegacySave)!,
      savedAt: 456,
      xp: 222,
    }
    const serializedExisting = JSON.stringify(existing)
    localStorage.setItem('dsa-quest-save-v2', serializedExisting)
    const malformedLegacy = JSON.stringify({ version: 1, quests: {}, xp: -1 })
    localStorage.setItem('dsa-quest-save-v1', malformedLegacy)

    expect(QuestManager.getSave()).toEqual(existing)
    expect(localStorage.getItem('dsa-quest-save-v2')).toBe(serializedExisting)
    expect(localStorage.getItem('dsa-quest-save-v1')).toBe(malformedLegacy)
  })

  it('keeps the v1 backup and quiz-history storage unchanged after successful migration', () => {
    const serializedLegacy = JSON.stringify(completedLegacySave)
    const history = JSON.stringify(['starting-index', 'count-elements'])
    const lastFirst = 'starting-index'
    localStorage.setItem('dsa-quest-save-v1', serializedLegacy)
    localStorage.setItem('dsa-quest-array-quiz-history-v1', history)
    localStorage.setItem('dsa-quest-array-quiz-last-first-v1', lastFirst)

    const migrated = QuestManager.getSave()

    expect(migrated?.version).toBe(2)
    expect(JSON.parse(localStorage.getItem('dsa-quest-save-v2') ?? 'null')).toMatchObject({
      version: 2,
      xp: completedLegacySave.xp,
      position: completedLegacySave.position,
    })
    expect(localStorage.getItem('dsa-quest-save-v1')).toBe(serializedLegacy)
    expect(localStorage.getItem('dsa-quest-array-quiz-history-v1')).toBe(history)
    expect(localStorage.getItem('dsa-quest-array-quiz-last-first-v1')).toBe(lastFirst)
  })

  it('leaves malformed legacy storage untouched and creates no v2 save', () => {
    const malformed = JSON.stringify({ version: 1, quests: { 'array-sorting-challenge': 'finished' }, xp: 5 })
    localStorage.setItem('dsa-quest-save-v1', malformed)

    expect(QuestManager.getSave()).toBeNull()
    expect(localStorage.getItem('dsa-quest-save-v1')).toBe(malformed)
    expect(localStorage.getItem('dsa-quest-save-v2')).toBeNull()
  })

  it('does not replace invalid v2 data with a stale v1 backup and reports recovery', () => {
    const invalidV2 = JSON.stringify({ version: 2, savedAt: 999, xp: 9999 })
    const serializedLegacy = JSON.stringify(completedLegacySave)
    const report = vi.spyOn(console, 'error').mockImplementation(() => {})
    localStorage.setItem('dsa-quest-save-v2', invalidV2)
    localStorage.setItem('dsa-quest-save-v1', serializedLegacy)

    expect(QuestManager.getSave()).toBeNull()
    expect(localStorage.getItem('dsa-quest-save-v2')).toBe(invalidV2)
    expect(localStorage.getItem('dsa-quest-save-v1')).toBe(serializedLegacy)
    expect(report).toHaveBeenCalledWith(expect.stringContaining('recovery'))
    expect(QuestManager.save()).toBe(false)
    expect(localStorage.getItem('dsa-quest-save-v2')).toBe(invalidV2)
    expect(localStorage.getItem('dsa-quest-save-v1')).toBe(serializedLegacy)
  })

  it('does not treat a failed migration read-back as successful', () => {
    const serializedLegacy = JSON.stringify(completedLegacySave)
    const originalGetItem = Storage.prototype.getItem
    localStorage.setItem('dsa-quest-save-v1', serializedLegacy)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key: string) {
      if (key === 'dsa-quest-save-v2') return '{"version":2}'
      return originalGetItem.call(this, key)
    })

    expect(QuestManager.getSave()).toBeNull()
    expect(localStorage.getItem('dsa-quest-save-v1')).toBe(serializedLegacy)
  })

  it('verifies the migrated Elder milestone on read-back', () => {
    const serializedLegacy = JSON.stringify(completedLegacySave)
    const originalGetItem = Storage.prototype.getItem
    localStorage.setItem('dsa-quest-save-v1', serializedLegacy)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key: string) {
      const raw = originalGetItem.call(this, key)
      if (key !== 'dsa-quest-save-v2' || raw === null) return raw
      const readBack = JSON.parse(raw) as CampaignSave
      readBack.elderIntroductoryMilestone = 'active'
      return JSON.stringify(readBack)
    })

    expect(QuestManager.getSave()).toBeNull()
    expect(localStorage.getItem('dsa-quest-save-v1')).toBe(serializedLegacy)
  })

  it('verifies opening-story fields on migration read-back', () => {
    const serializedLegacy = JSON.stringify(completedLegacySave)
    const originalGetItem = Storage.prototype.getItem
    localStorage.setItem('dsa-quest-save-v1', serializedLegacy)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key: string) {
      const raw = originalGetItem.call(this, key)
      if (key !== 'dsa-quest-save-v2' || raw === null) return raw
      const readBack = JSON.parse(raw) as CampaignSave
      readBack.openingStory = { status: 'skipped', storyVersion: 'altered' }
      return JSON.stringify(readBack)
    })

    expect(QuestManager.getSave()).toBeNull()
    expect(localStorage.getItem('dsa-quest-save-v1')).toBe(serializedLegacy)
  })

  it('clears both save versions when starting a new adventure', () => {
    localStorage.setItem('dsa-quest-save-v1', JSON.stringify(completedLegacySave))
    localStorage.setItem('dsa-quest-save-v2', JSON.stringify(migrateLegacySave(completedLegacySave)))

    QuestManager.clearSave()

    expect(localStorage.getItem('dsa-quest-save-v1')).toBeNull()
    expect(localStorage.getItem('dsa-quest-save-v2')).toBeNull()
  })
})
