import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QuestManager } from './QuestManager'
import { migrateCampaignSave } from './saveMigration'
import type { CampaignSave, LegacyQuestSave } from './questTypes'

const SAVE_KEY = 'dsa-quest-save-v3'

const legacySave: LegacyQuestSave = {
  version: 1,
  savedAt: 123,
  quests: {
    'speak-with-elder': 'completed',
    'array-sorting-challenge': 'completed',
  },
  xp: 137.5,
  position: { x: 282.25, y: 408.75 },
}

function seedCanonicalSave(): CampaignSave {
  const save = migrateCampaignSave(legacySave)
  if (!save) throw new Error('Expected a valid V3 fixture')
  QuestManager.restore(save)
  if (!QuestManager.save()) throw new Error('Expected fixture save to persist')
  return QuestManager.getSave()!
}

function loadPersistedSave(): CampaignSave {
  QuestManager.reset()
  const save = QuestManager.getSave()
  if (!save) throw new Error('Expected a persisted V3 save')
  QuestManager.restore(save)
  return save
}

function campaignFields(save: CampaignSave) {
  return {
    activeTopicId: save.activeTopicId,
    topics: save.topics,
    relicEntitlements: save.relicEntitlements,
    firstCompletionRewardClaims: save.firstCompletionRewardClaims,
    finalMasteryGrade: save.finalMasteryGrade,
    elderIntroductoryMilestone: save.elderIntroductoryMilestone,
    openingStory: save.openingStory,
    relicReturnStatus: save.relicReturnStatus,
    epilogueStatus: save.epilogueStatus,
    quests: save.quests,
    position: save.position,
    legacyCompletionXpCompensated: save.legacyCompletionXpCompensated,
  }
}

describe('Northern Scouting Trip QuestManager transitions', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    QuestManager.reset()
    seedCanonicalSave()
  })

  it('starts in the default not-started, unvisited and unclaimed state', () => {
    QuestManager.reset()
    expect(QuestManager.getSnapshot().northernSnowfieldScouting).toEqual({
      id: 'northern-snowfield-scouting',
      status: 'not-started',
      snowfieldVisited: false,
      rewardClaimed: false,
    })
  })

  it('persists acceptance, makes duplicate acceptance harmless, and keeps visit progress', () => {
    expect(QuestManager.acceptNorthernSnowfieldScouting()).toBe('started')
    expect(QuestManager.getSnapshot().northernSnowfieldScouting).toMatchObject({
      status: 'active',
      snowfieldVisited: false,
      rewardClaimed: false,
    })
    expect(QuestManager.acceptNorthernSnowfieldScouting()).toBe('already-started')
    expect(QuestManager.recordNorthernSnowfieldVisit()).toBe('visited')
    expect(QuestManager.acceptNorthernSnowfieldScouting()).toBe('already-started')
    expect(QuestManager.getSnapshot().northernSnowfieldScouting).toMatchObject({
      status: 'active',
      snowfieldVisited: true,
      rewardClaimed: false,
    })
  })

  it('rejects a visit before acceptance and treats a duplicate visit as harmless', () => {
    expect(QuestManager.recordNorthernSnowfieldVisit()).toBe('not-eligible')
    expect(QuestManager.acceptNorthernSnowfieldScouting()).toBe('started')
    expect(QuestManager.recordNorthernSnowfieldVisit()).toBe('visited')
    expect(QuestManager.recordNorthernSnowfieldVisit()).toBe('already-visited')
  })

  it('rejects a report before the snowfield visit', () => {
    expect(QuestManager.completeNorthernSnowfieldScouting()).toBe('not-eligible')
    expect(QuestManager.acceptNorthernSnowfieldScouting()).toBe('started')
    expect(QuestManager.completeNorthernSnowfieldScouting()).toBe('not-eligible')
  })

  it('restores accepted and visited progress from the persisted V3 save', () => {
    expect(QuestManager.acceptNorthernSnowfieldScouting()).toBe('started')
    expect(QuestManager.recordNorthernSnowfieldVisit()).toBe('visited')

    const restored = loadPersistedSave()

    expect(restored.northernSnowfieldScouting).toEqual({
      id: 'northern-snowfield-scouting',
      status: 'active',
      snowfieldVisited: true,
      rewardClaimed: false,
    })
    expect(QuestManager.getSnapshot().northernSnowfieldScouting).toEqual(
      restored.northernSnowfieldScouting,
    )
  })

  it('does not publish acceptance when the V3 write fails before persistence', () => {
    const before = QuestManager.getSnapshot()
    const originalSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === SAVE_KEY) throw new Error('Write failed before persistence')
      return originalSetItem.call(this, key, value)
    })
    const observed: string[] = []
    const unsubscribe = QuestManager.subscribe(() => {
      observed.push(QuestManager.getSnapshot().northernSnowfieldScouting.status)
    })

    expect(QuestManager.acceptNorthernSnowfieldScouting()).toBe('persistence-failed')
    expect(QuestManager.getSnapshot()).toBe(before)
    expect(observed).not.toContain('active')
    unsubscribe()
  })

  it('does not publish visit progress when its V3 write fails before persistence', () => {
    expect(QuestManager.acceptNorthernSnowfieldScouting()).toBe('started')
    const before = QuestManager.getSnapshot()
    const originalSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === SAVE_KEY) throw new Error('Write failed before persistence')
      return originalSetItem.call(this, key, value)
    })

    expect(QuestManager.recordNorthernSnowfieldVisit()).toBe('persistence-failed')
    expect(QuestManager.getSnapshot()).toBe(before)
    expect(QuestManager.getSnapshot().northernSnowfieldScouting.snowfieldVisited).toBe(false)
  })

  it('reconciles an uncertain acceptance write before acknowledging a retry', () => {
    const originalGetItem = Storage.prototype.getItem
    const originalSetItem = Storage.prototype.setItem
    let wroteV3 = false
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      originalSetItem.call(this, key, value)
      if (key === SAVE_KEY) wroteV3 = true
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key: string) {
      if (key === SAVE_KEY && wroteV3) throw new Error('Read-back failed')
      return originalGetItem.call(this, key)
    })

    expect(QuestManager.acceptNorthernSnowfieldScouting()).toBe('recovery-required')
    expect(QuestManager.getSnapshot().northernSnowfieldScouting.status).toBe('not-started')

    vi.restoreAllMocks()
    expect(QuestManager.acceptNorthernSnowfieldScouting()).toBe('already-started')
    expect(QuestManager.getSnapshot().northernSnowfieldScouting.status).toBe('active')
  })

  it('reconciles an uncertain visit write before acknowledging a retry', () => {
    expect(QuestManager.acceptNorthernSnowfieldScouting()).toBe('started')
    const originalGetItem = Storage.prototype.getItem
    const originalSetItem = Storage.prototype.setItem
    let wroteV3 = false
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      originalSetItem.call(this, key, value)
      if (key === SAVE_KEY) wroteV3 = true
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key: string) {
      if (key === SAVE_KEY && wroteV3) throw new Error('Read-back failed')
      return originalGetItem.call(this, key)
    })

    expect(QuestManager.recordNorthernSnowfieldVisit()).toBe('recovery-required')
    expect(QuestManager.getSnapshot().northernSnowfieldScouting.snowfieldVisited).toBe(false)

    vi.restoreAllMocks()
    expect(QuestManager.recordNorthernSnowfieldVisit()).toBe('already-visited')
    expect(QuestManager.getSnapshot().northernSnowfieldScouting.snowfieldVisited).toBe(true)
  })
})

describe('Northern Scouting Trip completion transaction', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    QuestManager.reset()
    seedCanonicalSave()
    expect(QuestManager.acceptNorthernSnowfieldScouting()).toBe('started')
    expect(QuestManager.recordNorthernSnowfieldVisit()).toBe('visited')
  })

  it('persists completion, the claim and exactly 25 XP in one V3 write', () => {
    const before = QuestManager.getSave()!
    const campaignBefore = campaignFields(before)
    const originalSetItem = Storage.prototype.setItem
    const v3Writes: string[] = []
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === SAVE_KEY) v3Writes.push(value)
      return originalSetItem.call(this, key, value)
    })

    expect(QuestManager.completeNorthernSnowfieldScouting()).toBe('completed')

    expect(v3Writes).toHaveLength(1)
    expect(JSON.parse(v3Writes[0])).toMatchObject({
      xp: before.xp + 25,
      northernSnowfieldScouting: {
        id: 'northern-snowfield-scouting',
        status: 'completed',
        snowfieldVisited: true,
        rewardClaimed: true,
      },
    })
    const after = QuestManager.getSave()!
    expect(after.xp).toBe(before.xp + 25)
    expect(after.northernSnowfieldScouting).toMatchObject({
      status: 'completed',
      snowfieldVisited: true,
      rewardClaimed: true,
    })
    expect(campaignFields(after)).toEqual(campaignBefore)
  })

  it('returns already-completed for repeated reports without awarding XP again', () => {
    expect(QuestManager.completeNorthernSnowfieldScouting()).toBe('completed')
    const completedXp = QuestManager.getSnapshot().xp

    expect(QuestManager.completeNorthernSnowfieldScouting()).toBe('already-completed')
    expect(QuestManager.completeNorthernSnowfieldScouting()).toBe('already-completed')
    expect(QuestManager.getSnapshot().xp).toBe(completedXp)
  })

  it('preserves the completion claim and reward across reload', () => {
    expect(QuestManager.completeNorthernSnowfieldScouting()).toBe('completed')
    const completedXp = QuestManager.getSnapshot().xp

    const restored = loadPersistedSave()

    expect(restored.xp).toBe(completedXp)
    expect(restored.northernSnowfieldScouting.rewardClaimed).toBe(true)
    expect(QuestManager.completeNorthernSnowfieldScouting()).toBe('already-completed')
    expect(QuestManager.getSnapshot().xp).toBe(completedXp)
  })

  it('returns persistence-failed and leaves runtime state unchanged when the write fails before persistence', () => {
    const before = QuestManager.getSnapshot()
    const originalSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === SAVE_KEY) throw new Error('Write failed before persistence')
      return originalSetItem.call(this, key, value)
    })

    expect(QuestManager.completeNorthernSnowfieldScouting()).toBe('persistence-failed')
    expect(QuestManager.getSnapshot()).toBe(before)
    expect(QuestManager.getSnapshot().xp).toBe(before.xp)
    expect(QuestManager.getSnapshot().northernSnowfieldScouting).toMatchObject({
      status: 'active',
      snowfieldVisited: true,
      rewardClaimed: false,
    })
  })

  it('reconciles an unchanged active visit before a safe retry after a failed write', () => {
    const beforeXp = QuestManager.getSnapshot().xp
    const originalSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(function (this: Storage, key: string, value: string) {
      if (key === SAVE_KEY) throw new Error('Write failed before persistence')
      return originalSetItem.call(this, key, value)
    })

    expect(QuestManager.completeNorthernSnowfieldScouting()).toBe('persistence-failed')
    expect(QuestManager.completeNorthernSnowfieldScouting()).toBe('completed')
    expect(QuestManager.getSnapshot().xp).toBe(beforeXp + 25)
    expect(QuestManager.completeNorthernSnowfieldScouting()).toBe('already-completed')
    expect(QuestManager.getSnapshot().xp).toBe(beforeXp + 25)
  })

  it('returns recovery-required when the write succeeds but read-back fails, then reconciles without a second reward', () => {
    const beforeXp = QuestManager.getSnapshot().xp
    const originalGetItem = Storage.prototype.getItem
    const originalSetItem = Storage.prototype.setItem
    let wroteV3 = false
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      originalSetItem.call(this, key, value)
      if (key === SAVE_KEY) wroteV3 = true
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key: string) {
      if (key === SAVE_KEY && wroteV3) throw new Error('Read-back failed')
      return originalGetItem.call(this, key)
    })

    expect(QuestManager.completeNorthernSnowfieldScouting()).toBe('recovery-required')
    expect(QuestManager.getSnapshot().xp).toBe(beforeXp)
    expect(QuestManager.getSnapshot().northernSnowfieldScouting.rewardClaimed).toBe(false)
    const persistedCompletion = originalGetItem.call(localStorage, SAVE_KEY)
    expect(QuestManager.save()).toBe(false)
    expect(() => QuestManager.awardXp(1)).toThrow(/canonical save reconciliation/)
    expect(originalGetItem.call(localStorage, SAVE_KEY)).toBe(persistedCompletion)
    expect(QuestManager.getSnapshot().xp).toBe(beforeXp)

    vi.restoreAllMocks()
    expect(QuestManager.completeNorthernSnowfieldScouting()).toBe('already-completed')
    expect(QuestManager.getSnapshot().xp).toBe(beforeXp + 25)
  })

  it('keeps reward mutations blocked when recovery storage is invalid', () => {
    const originalGetItem = Storage.prototype.getItem
    const originalSetItem = Storage.prototype.setItem
    let wroteV3 = false
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      originalSetItem.call(this, key, value)
      if (key === SAVE_KEY) wroteV3 = true
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key: string) {
      if (key === SAVE_KEY && wroteV3) throw new Error('Read-back failed')
      return originalGetItem.call(this, key)
    })

    expect(QuestManager.completeNorthernSnowfieldScouting()).toBe('recovery-required')
    vi.restoreAllMocks()
    localStorage.setItem(SAVE_KEY, '{"version":3}')

    expect(QuestManager.completeNorthernSnowfieldScouting()).toBe('recovery-required')
    expect(QuestManager.getSnapshot().northernSnowfieldScouting).toMatchObject({
      status: 'active',
      snowfieldVisited: true,
      rewardClaimed: false,
    })
  })

  it('keeps reward mutations blocked when recovery storage cannot be read', () => {
    const originalGetItem = Storage.prototype.getItem
    const originalSetItem = Storage.prototype.setItem
    let wroteV3 = false
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      originalSetItem.call(this, key, value)
      if (key === SAVE_KEY) wroteV3 = true
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key: string) {
      if (key === SAVE_KEY && wroteV3) throw new Error('Read-back failed')
      return originalGetItem.call(this, key)
    })

    expect(QuestManager.completeNorthernSnowfieldScouting()).toBe('recovery-required')
    vi.restoreAllMocks()
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key: string) {
      if (key === SAVE_KEY) throw new Error('Canonical save is unreadable')
      return originalGetItem.call(this, key)
    })

    expect(QuestManager.completeNorthernSnowfieldScouting()).toBe('recovery-required')
    expect(QuestManager.getSnapshot().northernSnowfieldScouting.rewardClaimed).toBe(false)
  })
})
