import type { OpeningStoryStatus } from '../quests/questTypes'

export type OpeningMangaDestination = 'opening-story' | 'game'
export type CampaignLaunchKind = 'new' | 'continue'

export function getOpeningMangaDestination(
  launchKind: CampaignLaunchKind,
  storyStatus: OpeningStoryStatus,
  openingStoryEnabled: boolean,
): OpeningMangaDestination {
  if (
    launchKind === 'new' &&
    storyStatus === 'not-seen' &&
    openingStoryEnabled
  ) {
    return 'opening-story'
  }
  return 'game'
}

export function isOpeningMangaPreviewRequested(
  isDevelopment: boolean,
  search: string,
): boolean {
  return isDevelopment && new URLSearchParams(search).get('opening-manga-preview') === '1'
}
