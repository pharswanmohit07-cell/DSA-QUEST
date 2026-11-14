import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QuestManager } from './QuestManager'
import { QuestTracker } from './QuestTracker'
import { isInsideNorthernSnowfieldTrigger } from './northernSnowfieldTrigger'
import { migrateCampaignSave } from './saveMigration'
import type { CampaignSave, LegacyQuestSave } from './questTypes'
import { setArraysCampaignStage } from './arraysCampaignStages'
import { claimKnowledgeScroll } from './knowledgeScrolls'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

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

let host: HTMLDivElement | undefined
let root: Root | undefined

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

function render(node: ReactNode): HTMLDivElement {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => root?.render(node))
  return host
}

function openTracker(container: HTMLElement): void {
  const button = container.querySelector<HTMLButtonElement>(
    '[data-testid="quest-tracker-toggle"]',
  )
  if (!button) throw new Error('Quest tracker toggle was not rendered')
  act(() => button.click())
}

function sideQuestSection(container: HTMLElement): HTMLElement | null {
  return container.querySelector('[data-testid="northern-snowfield-quest"]')
}

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  QuestManager.reset()
  seedCanonicalSave()
})

afterEach(() => {
  if (root) act(() => root?.unmount())
  host?.remove()
  root = undefined
  host = undefined
  vi.restoreAllMocks()
  localStorage.clear()
  QuestManager.reset()
})

describe('optional Northern Scouting Trip tracker', () => {
  it('keeps the not-started quest hidden, then shows separate active and visited objectives', () => {
    const container = render(<QuestTracker />)
    openTracker(container)

    expect(container.textContent).not.toContain('Optional Side Quest')
    expect(sideQuestSection(container)).toBeNull()

    act(() => {
      expect(QuestManager.acceptNorthernSnowfieldScouting()).toBe('started')
    })

    expect(container.textContent).toContain('Optional Side Quest')
    expect(sideQuestSection(container)?.getAttribute('data-status')).toBe('active')
    expect(
      Array.from(sideQuestSection(container)?.querySelectorAll('p') ?? []).map(
        (paragraph) => paragraph.textContent,
      ),
    ).toEqual(['Visit the northern snowfield beyond the torii.'])
    expect(container.querySelectorAll('.quest-row')).toHaveLength(1)
    expect(container.querySelector('[aria-label="Quest progress 0 / 3"]')).not.toBeNull()
    expect(container.textContent).toContain('4 completed')

    act(() => {
      expect(QuestManager.recordNorthernSnowfieldVisit()).toBe('visited')
    })

    expect(
      Array.from(sideQuestSection(container)?.querySelectorAll('p') ?? []).map(
        (paragraph) => paragraph.textContent,
      ),
    ).toEqual([
      'Snowfield visit — complete.',
      'Return to the Elder and report.',
    ])
    expect(container.querySelectorAll('.quest-row')).toHaveLength(1)
    expect(container.querySelector('[aria-label="Quest progress 0 / 3"]')).not.toBeNull()
    expect(container.textContent).toContain('4 completed')
  })

  it('keeps a failed visit unvisited and safely retries after leaving and re-entering', () => {
    const container = render(<QuestTracker />)
    openTracker(container)
    const triggerBody = { center: { x: 200 }, bottom: 288 }
    const outsideBody = { center: { x: 183 }, bottom: 288 }
    act(() => {
      QuestManager.acceptNorthernSnowfieldScouting()
    })
    const originalSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === SAVE_KEY) throw new Error('Write failed before persistence')
      return originalSetItem.call(this, key, value)
    })

    act(() => {
      expect(QuestManager.recordNorthernSnowfieldVisit()).toBe('persistence-failed')
    })

    expect(QuestManager.getSnapshot().northernSnowfieldScouting.snowfieldVisited).toBe(false)
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).northernSnowfieldScouting).toMatchObject({
      status: 'active',
      snowfieldVisited: false,
    })
    expect(sideQuestSection(container)).not.toBeNull()
    expect(
      Array.from(sideQuestSection(container)?.querySelectorAll('p') ?? []).map(
        (paragraph) => paragraph.textContent,
      ),
    ).toEqual(['Visit the northern snowfield beyond the torii.'])
    expect(sideQuestSection(container)?.textContent ?? '').not.toContain(
      'Return to the Elder',
    )
    expect(isInsideNorthernSnowfieldTrigger(triggerBody)).toBe(true)
    expect(isInsideNorthernSnowfieldTrigger(outsideBody)).toBe(false)

    vi.restoreAllMocks()
    expect(isInsideNorthernSnowfieldTrigger(triggerBody)).toBe(true)
    act(() => {
      expect(QuestManager.recordNorthernSnowfieldVisit()).toBe('visited')
    })

    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).northernSnowfieldScouting).toMatchObject({
      status: 'active',
      snowfieldVisited: true,
    })
    expect(
      Array.from(sideQuestSection(container)?.querySelectorAll('p') ?? []).map(
        (paragraph) => paragraph.textContent,
      ),
    ).toEqual([
      'Snowfield visit — complete.',
      'Return to the Elder and report.',
    ])
    expect(QuestManager.recordNorthernSnowfieldVisit()).toBe('already-visited')
  })

  it('withholds completion and reward feedback until an uncertain save is reconciled', () => {
    const container = render(<QuestTracker />)
    openTracker(container)
    act(() => {
      QuestManager.acceptNorthernSnowfieldScouting()
      QuestManager.recordNorthernSnowfieldVisit()
    })
    const beforeXp = QuestManager.getSnapshot().xp
    const originalGetItem = Storage.prototype.getItem
    const originalSetItem = Storage.prototype.setItem

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === SAVE_KEY) throw new Error('Write failed before persistence')
      return originalSetItem.call(this, key, value)
    })

    act(() => {
      expect(QuestManager.completeNorthernSnowfieldScouting()).toBe('persistence-failed')
    })

    expect(QuestManager.getSnapshot().xp).toBe(beforeXp)
    expect(sideQuestSection(container)?.getAttribute('data-status')).toBe('active')
    expect(sideQuestSection(container)?.textContent).not.toContain('25 XP claimed')
    vi.restoreAllMocks()

    let wroteCompletion = false

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      originalSetItem.call(this, key, value)
      if (key === SAVE_KEY) wroteCompletion = true
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (
      this: Storage,
      key: string,
    ) {
      if (key === SAVE_KEY && wroteCompletion) throw new Error('Read-back failed')
      return originalGetItem.call(this, key)
    })

    act(() => {
      expect(QuestManager.completeNorthernSnowfieldScouting()).toBe('recovery-required')
    })

    expect(QuestManager.getSnapshot().xp).toBe(beforeXp)
    expect(sideQuestSection(container)?.getAttribute('data-status')).toBe('active')
    expect(sideQuestSection(container)?.textContent).not.toContain('25 XP claimed')
    expect(
      Array.from(sideQuestSection(container)?.querySelectorAll('p') ?? []).map(
        (paragraph) => paragraph.textContent,
      ),
    ).toEqual([
      'Snowfield visit — complete.',
      'Return to the Elder and report.',
    ])

    vi.restoreAllMocks()
    act(() => {
      expect(QuestManager.completeNorthernSnowfieldScouting()).toBe('already-completed')
    })

    expect(QuestManager.getSnapshot().xp).toBe(beforeXp + 25)
    expect(sideQuestSection(container)?.getAttribute('data-status')).toBe('completed')
    expect(
      Array.from(sideQuestSection(container)?.querySelectorAll('p') ?? []).map(
        (paragraph) => paragraph.textContent,
      ),
    ).toEqual([
      'Visit northern snowfield — completed.',
      'Report to Elder — completed.',
      '25 XP claimed.',
    ])
  })

  it('keeps side-quest completion outside campaign progress and remains claimed after reload', () => {
    const container = render(<QuestTracker />)
    openTracker(container)
    const before = QuestManager.getSave()!

    act(() => {
      QuestManager.acceptNorthernSnowfieldScouting()
      QuestManager.recordNorthernSnowfieldVisit()
      expect(QuestManager.completeNorthernSnowfieldScouting()).toBe('completed')
    })

    const completed = QuestManager.getSave()!
    expect(completed.xp).toBe(before.xp + 25)
    expect(completed.northernSnowfieldScouting).toMatchObject({
      status: 'completed',
      snowfieldVisited: true,
      rewardClaimed: true,
    })
    expect(completed.topics).toEqual(before.topics)
    expect(completed.relicEntitlements).toEqual(before.relicEntitlements)
    expect(completed.firstCompletionRewardClaims).toEqual(
      before.firstCompletionRewardClaims,
    )
    expect(completed.finalMasteryGrade).toBe(before.finalMasteryGrade)
    expect(sideQuestSection(container)?.getAttribute('data-status')).toBe('completed')
    expect(
      Array.from(sideQuestSection(container)?.querySelectorAll('p') ?? []).map(
        (paragraph) => paragraph.textContent,
      ),
    ).toEqual([
      'Visit northern snowfield — completed.',
      'Report to Elder — completed.',
      '25 XP claimed.',
    ])
    expect(container.querySelectorAll('.quest-row')).toHaveLength(1)
    expect(container.querySelector('[aria-label="Quest progress 0 / 3"]')).not.toBeNull()
    expect(container.textContent).toContain('4 completed')

    let restored!: CampaignSave
    act(() => {
      restored = loadPersistedSave()
    })
    expect(restored.xp).toBe(before.xp + 25)
    expect(restored.northernSnowfieldScouting.rewardClaimed).toBe(true)
    expect(sideQuestSection(container)?.getAttribute('data-status')).toBe('completed')
    expect(sideQuestSection(container)?.textContent).toContain('25 XP claimed')
    expect(container.querySelector('[data-testid="player-xp"]')?.textContent).toBe('212.5 XP')
    expect(QuestManager.completeNorthernSnowfieldScouting()).toBe('already-completed')
    expect(QuestManager.completeNorthernSnowfieldScouting()).toBe('already-completed')
    expect(QuestManager.getSnapshot().xp).toBe(before.xp + 25)
  })
})

describe('optional Village Training Route tracker', () => {
  it('keeps the route hidden before acceptance and shows stage objectives', () => {
    const container = render(<QuestTracker />)
    openTracker(container)

    expect(container.querySelector('[data-testid="village-training-route-quest"]')).toBeNull()

    act(() => {
      expect(QuestManager.acceptVillageTrainingRoute()).toBe('started')
    })

    const routeSection = () =>
      container.querySelector<HTMLElement>('[data-testid="village-training-route-quest"]')
    expect(routeSection()).not.toBeNull()
    expect(routeSection()?.getAttribute('data-status')).toBe('active')
    expect(routeSection()?.textContent).toContain('Village Training Route')
    expect(routeSection()?.textContent).toContain('Visit the Monk for guidance.')

    act(() => {
      expect(QuestManager.acknowledgeVillageMonk()).toBe('visited')
    })
    expect(routeSection()?.textContent).toContain("Take the Samurai's trial at the dojo.")

    act(() => {
      expect(QuestManager.recordVillageTrainingTrialPass()).toBe('visited')
    })
    expect(routeSection()?.textContent).toContain('Return to the Village Guide and report.')

    act(() => {
      expect(QuestManager.completeVillageTrainingRoute()).toBe('completed')
    })
    expect(routeSection()?.getAttribute('data-status')).toBe('completed')
    expect(routeSection()?.textContent).toContain('25 XP claimed.')
  })

  it('renders both optional side quests as separate entries', () => {
    const container = render(<QuestTracker />)
    openTracker(container)
    act(() => {
      expect(QuestManager.acceptNorthernSnowfieldScouting()).toBe('started')
      expect(QuestManager.acceptVillageTrainingRoute()).toBe('started')
    })

    expect(sideQuestSection(container)).not.toBeNull()
    expect(
      container.querySelector('[data-testid="village-training-route-quest"]'),
    ).not.toBeNull()
    expect(container.querySelectorAll('[data-testid="northern-snowfield-quest"]')).toHaveLength(1)
  })

  it('does not show route completion or reward until the save is confirmed', () => {
    const container = render(<QuestTracker />)
    openTracker(container)
    act(() => {
      QuestManager.acceptVillageTrainingRoute()
      QuestManager.acknowledgeVillageMonk()
      QuestManager.recordVillageTrainingTrialPass()
    })
    const routeSection = () =>
      container.querySelector<HTMLElement>('[data-testid="village-training-route-quest"]')
    const beforeXp = QuestManager.getSnapshot().xp
    const originalSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === SAVE_KEY) throw new Error('Write failed before persistence')
      return originalSetItem.call(this, key, value)
    })

    act(() => {
      expect(QuestManager.completeVillageTrainingRoute()).toBe('persistence-failed')
    })

    expect(QuestManager.getSnapshot().xp).toBe(beforeXp)
    expect(routeSection()?.getAttribute('data-status')).toBe('active')
    expect(routeSection()?.textContent).not.toContain('25 XP claimed')
    vi.restoreAllMocks()

    act(() => {
      expect(QuestManager.completeVillageTrainingRoute()).toBe('completed')
    })
    expect(routeSection()?.getAttribute('data-status')).toBe('completed')
    expect(routeSection()?.textContent).toContain('25 XP claimed')
  })
})

function completeFreshOldManGateQuest(): void {
  QuestManager.reset()
  localStorage.clear()
  expect(QuestManager.completeQuest('speak-with-elder')).toBe(true)
  expect(QuestManager.isActive('array-sorting-challenge')).toBe(true)
  expect(QuestManager.completeQuest('array-sorting-challenge')).toBe(true)
}

describe('Village Guide Arrays quest handoff', () => {
  it('hands the current quest to the existing Village Guide after the Old Man gate quest', () => {
    completeFreshOldManGateQuest()
    const container = render(<QuestTracker />)
    openTracker(container)

    expect(container.textContent).toContain('Village Guide — Arrays')
    expect(container.textContent).not.toContain('Arrays 1')
    expect(container.querySelector('[aria-label="Quest progress 0 / 3"]')).not.toBeNull()
    expect(container.textContent).toContain('Speak to the Village Guide and learn the foundations of arrays.')
    expect(container.querySelector('[data-testid="quest-arrays-1-village-guide"]')?.getAttribute('data-status')).toBe('active')
  })

  it('updates the current objective as the Guide lesson advances', () => {
    completeFreshOldManGateQuest()
    const container = render(<QuestTracker />)
    openTracker(container)

    act(() => setArraysCampaignStage('practice'))
    expect(container.querySelector('[aria-label="Quest progress 1 / 3"]')).not.toBeNull()
    expect(container.textContent).toContain('Complete the three guided Arrays practice questions.')

    act(() => setArraysCampaignStage('implement'))
    expect(container.querySelector('[aria-label="Quest progress 2 / 3"]')).not.toBeNull()
    expect(container.textContent).toContain('Complete the interactive Array Manipulation Workshop.')
  })

  it('moves the current quest to Samurai after Arrays implementation completes', () => {
    completeFreshOldManGateQuest()
    QuestManager.startTopic('arrays')
    expect(QuestManager.completeTopic('arrays', { passed: true, masteryGrade: 'A', hintsUsed: 0 })).toBe(true)
    setArraysCampaignStage('complete')
    const container = render(<QuestTracker />)
    openTracker(container)

    expect(container.textContent).toContain('Samurai — Stack Operations')
    expect(container.querySelector('[aria-label="Quest progress 0 / 3"]')).not.toBeNull()
    expect(container.textContent).not.toContain('Village Guide — Arrays')
    expect(container.querySelector('[data-testid="quest-stack-operations-samurai"]')?.getAttribute('data-status')).toBe('active')
  })

  it('moves the current quest to Farmer after Stack implementation completes', () => {
    completeFreshOldManGateQuest()
    QuestManager.startTopic('arrays')
    expect(QuestManager.completeTopic('arrays', { passed: true, masteryGrade: 'A', hintsUsed: 0 })).toBe(true)
    setArraysCampaignStage('complete')
    QuestManager.startTopic('stack-operations')
    expect(QuestManager.completeTopic('stack-operations', { passed: true, masteryGrade: 'A', hintsUsed: 0 })).toBe(true)
    const container = render(<QuestTracker />)
    openTracker(container)

    expect(container.textContent).toContain('Farmer — Queues')
    expect(container.querySelector('[aria-label="Quest progress 0 / 3"]')).not.toBeNull()
    expect(container.textContent).not.toContain('Village Guide — Arrays')
    expect(container.textContent).not.toContain('Samurai — Stack Operations')
  })

  it('refreshes Stack and Queue progress from their stage-change event without remounting', () => {
    completeFreshOldManGateQuest()
    QuestManager.startTopic('arrays')
    expect(QuestManager.completeTopic('arrays', { passed: true, masteryGrade: 'A', hintsUsed: 0 })).toBe(true)
    setArraysCampaignStage('complete')
    const container = render(<QuestTracker />)
    openTracker(container)

    act(() => {
      localStorage.setItem('dsaq-npc-campaign-stages-v1', JSON.stringify({ 'stack-operations': 'practice' }))
      window.dispatchEvent(new Event('dsaq:npc-campaign-stage-changed'))
    })
    expect(container.querySelector('[aria-label="Quest progress 1 / 3"]')).not.toBeNull()
    expect(container.textContent).toContain('Complete the three Stack Operations practice questions.')

    act(() => {
      expect(QuestManager.startTopic('stack-operations')).toBe(true)
      expect(QuestManager.completeTopic('stack-operations', { passed: true, masteryGrade: 'A', hintsUsed: 0 })).toBe(true)
      localStorage.setItem('dsaq-npc-campaign-stages-v1', JSON.stringify({ queues: 'implement' }))
      window.dispatchEvent(new Event('dsaq:npc-campaign-stage-changed'))
    })
    expect(container.querySelector('[aria-label="Quest progress 2 / 3"]')).not.toBeNull()
    expect(container.textContent).toContain('Complete the independent five-parcel delivery route.')
  })

  it('does not let an already collected Arrays Scroll alter the next main objective', () => {
    completeFreshOldManGateQuest()
    QuestManager.startTopic('arrays')
    expect(QuestManager.completeTopic('arrays', { passed: true, masteryGrade: 'A', hintsUsed: 0 })).toBe(true)
    setArraysCampaignStage('complete')
    claimKnowledgeScroll('arrays')
    const container = render(<QuestTracker />)
    openTracker(container)

    expect(container.textContent).toContain('Samurai — Stack Operations')
    expect(container.textContent).not.toContain('Arrays Knowledge Scroll')
  })
})
