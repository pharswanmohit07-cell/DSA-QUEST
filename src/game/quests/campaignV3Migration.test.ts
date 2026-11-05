import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QuestManager } from './QuestManager'
import {
  isCampaignSave,
  isCampaignSaveV3,
  migrateCampaignSave,
  migrateLegacySave,
} from './saveMigration'
import { CAMPAIGN_TOPICS } from './campaignDefinitions'
import type { CampaignSaveV3Input, LegacyQuestSave } from './questTypes'

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

describe('version 3 campaign migration', () => {
  beforeEach(() => {
    localStorage.clear()
    QuestManager.reset()
  })

  it('compensates a completed legacy combined quest once and unlocks Queues', () => {
    const migrated = migrateCampaignSave(completedLegacySave)

    expect(migrated?.version).toBe(3)
    expect(migrated?.northernSnowfieldScouting).toEqual({
      id: 'northern-snowfield-scouting',
      status: 'not-started',
      snowfieldVisited: false,
      rewardClaimed: false,
    })
    expect(migrated?.xp).toBe(187.5)
    expect(migrated?.legacyCompletionXpCompensated).toBe(true)
    expect(migrated?.topics.arrays.status).toBe('completed')
    expect(migrated?.topics['stack-operations'].status).toBe('completed')
    expect(migrated?.topics.arrays.attemptCount).toBe(0)
    expect(migrated?.topics['stack-operations'].attemptCount).toBe(0)
    expect(migrated?.topics.queues.status).toBe('available')
    expect(migrated?.relicEntitlements).toEqual(['array-relic', 'stack-relic'])
    expect(migrated?.position).toEqual(completedLegacySave.position)
    expect(isCampaignSave(migrated)).toBe(true)
  })

  it('upgrades a valid V2 legacy completion and compensates it once', () => {
    const v2 = migrateLegacySave(completedLegacySave)
    expect(v2?.version).toBe(2)
    if (!v2) return
    v2.xp = 222
    v2.topics.arrays.bestMasteryGrade = 'A'
    v2.topics.arrays.attemptCount = 3
    v2.topics['stack-operations'].attemptCount = 2

    const migrated = migrateCampaignSave(v2)

    expect(migrated?.version).toBe(3)
    expect(migrated?.xp).toBe(272)
    expect(migrated?.northernSnowfieldScouting).toEqual({
      id: 'northern-snowfield-scouting',
      status: 'not-started',
      snowfieldVisited: false,
      rewardClaimed: false,
    })
    expect(migrated?.topics.arrays.bestMasteryGrade).toBe('A')
    expect(migrated?.legacyCompletionXpCompensated).toBe(true)
  })

  it('writes V3 from V2 while preserving V2 and V1 backups', () => {
    const v2 = migrateLegacySave(completedLegacySave)
    const v2Raw = JSON.stringify(v2)
    const v1Raw = JSON.stringify(completedLegacySave)
    localStorage.setItem('dsa-quest-save-v2', v2Raw)
    localStorage.setItem('dsa-quest-save-v1', v1Raw)

    const migrated = QuestManager.getSave()

    expect(migrated?.version).toBe(3)
    expect(localStorage.getItem('dsa-quest-save-v3')).not.toBeNull()
    expect(localStorage.getItem('dsa-quest-save-v2')).toBe(v2Raw)
    expect(localStorage.getItem('dsa-quest-save-v1')).toBe(v1Raw)
    expect(QuestManager.getSave()?.xp).toBe(migrated?.xp)
  })

  it('preserves the compensation marker when restoring a V3 save without a local backup', () => {
    const migrated = migrateCampaignSave(completedLegacySave)
    if (!migrated) return

    QuestManager.restore(migrated)
    expect(QuestManager.save()).toBe(true)
    expect(QuestManager.getSave()?.legacyCompletionXpCompensated).toBe(true)
    expect(QuestManager.getSave()?.xp).toBe(187.5)
  })

  it('does not fall back from an invalid V3 save to an older valid V2 save', () => {
    const v2Raw = JSON.stringify(migrateLegacySave(completedLegacySave))
    const invalidV3 = '{"version":3,"topics":{}}'
    localStorage.setItem('dsa-quest-save-v2', v2Raw)
    localStorage.setItem('dsa-quest-save-v3', invalidV3)

    expect(QuestManager.getSave()).toBeNull()
    expect(localStorage.getItem('dsa-quest-save-v3')).toBe(invalidV3)
    expect(localStorage.getItem('dsa-quest-save-v2')).toBe(v2Raw)
  })

  it('normalizes a valid pre-feature V3 in memory without rewriting it, then saves the default field normally', () => {
    const currentSave = migrateCampaignSave(completedLegacySave)
    if (!currentSave) throw new Error('Expected valid V3 fixture')
    const legacySave = { ...currentSave } as Record<string, unknown>
    delete legacySave.northernSnowfieldScouting
    const legacyRaw = JSON.stringify(legacySave)
    localStorage.setItem('dsa-quest-save-v3', legacyRaw)

    const loaded = QuestManager.getSave()

    expect(loaded?.northernSnowfieldScouting).toEqual({
      id: 'northern-snowfield-scouting',
      status: 'not-started',
      snowfieldVisited: false,
      rewardClaimed: false,
    })
    if (!loaded) throw new Error('Expected normalized V3 save')
    const expectedOtherFields = Object.fromEntries(
      Object.entries(currentSave).filter(([key]) => key !== 'northernSnowfieldScouting'),
    )
    const loadedOtherFields = Object.fromEntries(
      Object.entries(loaded).filter(([key]) => key !== 'northernSnowfieldScouting'),
    )
    expect(loadedOtherFields).toEqual(expectedOtherFields)
    expect(localStorage.getItem('dsa-quest-save-v3')).toBe(legacyRaw)

    QuestManager.restore(loaded)
    expect(QuestManager.save()).toBe(true)
    expect(JSON.parse(localStorage.getItem('dsa-quest-save-v3') ?? 'null'))
      .toHaveProperty('northernSnowfieldScouting', {
        id: 'northern-snowfield-scouting',
        status: 'not-started',
        snowfieldVisited: false,
        rewardClaimed: false,
      })
  })

  it('rejects an ordinary save when read-back drops the newly required side-quest field', () => {
    const save = migrateCampaignSave(completedLegacySave)
    if (!save) throw new Error('Expected valid V3 fixture')
    QuestManager.restore(save)
    const originalGetItem = Storage.prototype.getItem
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key: string) {
      const raw = originalGetItem.call(this, key)
      if (key !== 'dsa-quest-save-v3' || raw === null) return raw
      const readBack = JSON.parse(raw) as Record<string, unknown>
      delete readBack.northernSnowfieldScouting
      return JSON.stringify(readBack)
    })

    expect(QuestManager.save()).toBe(false)
  })

  it.each([
    ['not-started', false, false],
    ['active', false, false],
    ['active', true, false],
    ['completed', true, true],
  ] as const)(
    'accepts and restores the valid side-quest state %s/%s/%s',
    (status, snowfieldVisited, rewardClaimed) => {
      const base = migrateCampaignSave(completedLegacySave)
      if (!base) throw new Error('Expected valid V3 fixture')
      const save = {
        ...base,
        northernSnowfieldScouting: {
          id: 'northern-snowfield-scouting',
          status,
          snowfieldVisited,
          rewardClaimed,
        },
      }
      localStorage.setItem('dsa-quest-save-v3', JSON.stringify(save))

      const loaded = QuestManager.getSave()
      expect(loaded?.northernSnowfieldScouting).toEqual(save.northernSnowfieldScouting)
      expect(isCampaignSaveV3(save)).toBe(true)
      if (!loaded) throw new Error('Expected valid V3 save')
      QuestManager.restore(loaded)
      expect(QuestManager.getSnapshot().northernSnowfieldScouting)
        .toEqual(save.northernSnowfieldScouting)
      expect(QuestManager.save()).toBe(true)
      expect(QuestManager.getSave()?.northernSnowfieldScouting)
        .toEqual(save.northernSnowfieldScouting)
    },
  )

  it.each([
    ['wrong ID', { id: 'other-quest', status: 'not-started', snowfieldVisited: false, rewardClaimed: false }],
    ['invalid status', { id: 'northern-snowfield-scouting', status: 'failed', snowfieldVisited: false, rewardClaimed: false }],
    ['non-boolean visit flag', { id: 'northern-snowfield-scouting', status: 'active', snowfieldVisited: 'true', rewardClaimed: false }],
    ['non-boolean claim flag', { id: 'northern-snowfield-scouting', status: 'active', snowfieldVisited: false, rewardClaimed: 0 }],
    ['not-started with visit', { id: 'northern-snowfield-scouting', status: 'not-started', snowfieldVisited: true, rewardClaimed: false }],
    ['active with claim', { id: 'northern-snowfield-scouting', status: 'active', snowfieldVisited: true, rewardClaimed: true }],
    ['completed without visit', { id: 'northern-snowfield-scouting', status: 'completed', snowfieldVisited: false, rewardClaimed: true }],
    ['completed without claim', { id: 'northern-snowfield-scouting', status: 'completed', snowfieldVisited: true, rewardClaimed: false }],
  ])('rejects a V3 side-quest field with %s', (_case, sideQuest) => {
    const base = migrateCampaignSave(completedLegacySave)
    if (!base) throw new Error('Expected valid V3 fixture')
    const invalid = { ...base, northernSnowfieldScouting: sideQuest }

    expect(isCampaignSaveV3(invalid)).toBe(false)
  })

  it('preserves an invalid V3 side-quest save and does not fall back to V2', () => {
    const base = migrateCampaignSave(completedLegacySave)
    if (!base) throw new Error('Expected valid V3 fixture')
    const invalid = {
      ...base,
      northernSnowfieldScouting: {
        id: 'northern-snowfield-scouting',
        status: 'completed',
        snowfieldVisited: true,
        rewardClaimed: false,
      },
    }
    const invalidRaw = JSON.stringify(invalid)
    const validV2Raw = JSON.stringify(migrateLegacySave(completedLegacySave))
    localStorage.setItem('dsa-quest-save-v3', invalidRaw)
    localStorage.setItem('dsa-quest-save-v2', validV2Raw)
    const report = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(QuestManager.getSave()).toBeNull()
    expect(localStorage.getItem('dsa-quest-save-v3')).toBe(invalidRaw)
    expect(localStorage.getItem('dsa-quest-save-v2')).toBe(validV2Raw)
    expect(report).toHaveBeenCalledWith(expect.stringContaining('recovery'))
    expect(QuestManager.save()).toBe(false)
    expect(localStorage.getItem('dsa-quest-save-v3')).toBe(invalidRaw)
  })

  it('normalizes pre-feature V3 at restore before publishing runtime state', () => {
    const currentSave = migrateCampaignSave(completedLegacySave)
    if (!currentSave) throw new Error('Expected valid V3 fixture')
    const legacySave: CampaignSaveV3Input = { ...currentSave }
    delete legacySave.northernSnowfieldScouting

    QuestManager.restore(legacySave)

    expect(QuestManager.getSnapshot().northernSnowfieldScouting).toEqual({
      id: 'northern-snowfield-scouting',
      status: 'not-started',
      snowfieldVisited: false,
      rewardClaimed: false,
    })
  })

  it('restores a valid V3 save without rewriting it', () => {
    expect(QuestManager.startTopic('arrays')).toBe(true)
    expect(QuestManager.completeTopic('arrays', {
      passed: true,
      masteryGrade: 'A',
      hintsUsed: 0,
    })).toBe(true)
    const raw = localStorage.getItem('dsa-quest-save-v3')
    expect(raw).not.toBeNull()

    expect(QuestManager.getSave()?.version).toBe(3)
    expect(localStorage.getItem('dsa-quest-save-v3')).toBe(raw)
    expect(localStorage.getItem('dsa-quest-save-v2')).toBeNull()
  })

  it('validates the final mastery grade against all completed topic grades', () => {
    for (const topic of CAMPAIGN_TOPICS) {
      expect(QuestManager.startTopic(topic.id)).toBe(true)
      expect(QuestManager.completeTopic(topic.id, {
        passed: true,
        masteryGrade: 'A',
        hintsUsed: 0,
      })).toBe(true)
    }

    const save = QuestManager.getSave()
    expect(save?.finalMasteryGrade).toBe('A')
    expect(isCampaignSave(save)).toBe(true)
    if (!save) return

    expect(isCampaignSave({ ...save, finalMasteryGrade: 'S' })).toBe(false)
    expect(isCampaignSave({ ...save, finalMasteryGrade: null })).toBe(false)
    const invalidMarker: unknown = {
      ...save,
      legacyCompletionXpCompensated: 'true',
    }
    expect(isCampaignSave(invalidMarker)).toBe(false)

    const completedLegacyQuest: unknown = {
      ...save,
      quests: { ...save.quests, 'array-sorting-challenge': 'completed' },
    }
    expect(isCampaignSave(completedLegacyQuest)).toBe(true)
    const untrackedLegacyCompletion: unknown = {
      ...save,
      quests: { ...save.quests, 'array-sorting-challenge': 'completed' },
      topics: {
        ...save.topics,
        arrays: { ...save.topics.arrays, attemptCount: 0 },
      },
    }
    expect(isCampaignSave(untrackedLegacyCompletion)).toBe(false)
    expect(isCampaignSave({
      ...save,
      legacyCompletionXpCompensated: true,
    })).toBe(false)
  })
})
