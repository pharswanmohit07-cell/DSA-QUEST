import { beforeEach, describe, expect, it } from 'vitest'
import { QuestManager } from '../quests/QuestManager'
import { getOpeningMangaDestination, isOpeningMangaPreviewRequested } from './openingMangaFlow'

describe('opening manga campaign flow', () => {
  beforeEach(() => {
    localStorage.clear()
    QuestManager.reset()
  })

  it('routes a new unseen campaign to the viewer only when the story is enabled', () => {
    expect(getOpeningMangaDestination('new', 'not-seen', true)).toBe('opening-story')
    expect(getOpeningMangaDestination('new', 'not-seen', false)).toBe('game')
  })

  it('continues existing campaigns directly to the village', () => {
    expect(getOpeningMangaDestination('continue', 'not-seen', true)).toBe('game')
    expect(getOpeningMangaDestination('continue', 'completed', true)).toBe('game')
  })

  it.each(['completed', 'skipped'] as const)(
    'does not replay a %s story after its saved state is restored',
    (status) => {
      expect(QuestManager.markOpeningStorySeen(status, 'opening-manga-v1')).toBe(true)
      const saved = QuestManager.getSave()
      expect(saved?.openingStory.status).toBe(status)
      QuestManager.reset()
      if (saved) QuestManager.restore(saved)

      expect(
        getOpeningMangaDestination('new', QuestManager.getCampaign().openingStory.status, true),
      ).toBe('game')
      expect(
        getOpeningMangaDestination('continue', QuestManager.getCampaign().openingStory.status, true),
      ).toBe('game')
    },
  )

  it.each(['completed', 'skipped'] as const)(
    'keeps story status %s free of campaign rewards',
    (status) => {
      QuestManager.save({ x: 17, y: 29 })
      const before = QuestManager.getCampaign()

      expect(QuestManager.markOpeningStorySeen(status, 'opening-manga-v1')).toBe(true)

      const after = QuestManager.getCampaign()
      expect(after.xp).toBe(before.xp)
      expect(after.topics).toEqual(before.topics)
      expect(after.relicEntitlements).toEqual(before.relicEntitlements)
      expect(after.firstCompletionRewardClaims).toEqual(before.firstCompletionRewardClaims)
      expect(after.position).toEqual(before.position)
    },
  )

  it('exposes the preview route only in development when explicitly requested', () => {
    expect(isOpeningMangaPreviewRequested(true, '?opening-manga-preview=1')).toBe(true)
    expect(isOpeningMangaPreviewRequested(false, '?opening-manga-preview=1')).toBe(false)
    expect(isOpeningMangaPreviewRequested(true, '')).toBe(false)
  })
})
