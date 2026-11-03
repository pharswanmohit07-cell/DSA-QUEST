export type OpeningStoryOutcome = 'completed' | 'skipped'

export type OpeningMangaPanel = {
  id: string
  filename: string
  src: string
  narration?: string
  dialogue?: {
    speaker?: string
    text: string
  }
  caption?: string
}

export type OpeningMangaPage = {
  id: string
  panels: readonly OpeningMangaPanel[]
}

export type OpeningMangaStory = {
  version: string
  title: string
  pages: readonly OpeningMangaPage[]
}

const pendingCopy = 'Story copy pending approval.'

const panels: OpeningMangaPanel[] = Array.from({ length: 10 }, (_, index) => {
  const number = index + 1
  const filename = `opening-panel-${String(number).padStart(2, '0')}.png`
  return {
    id: `panel-${String(number).padStart(2, '0')}`,
    filename,
    src: `/assets/opening-manga/${filename}`,
    narration: pendingCopy,
    dialogue: { text: pendingCopy },
  }
})

export const OPENING_MANGA_STORY: OpeningMangaStory = {
  version: 'opening-manga-v1',
  title: 'The Shattering of Seven',
  pages: [
    { id: 'page-01', panels: panels.slice(0, 2) },
    { id: 'page-02', panels: panels.slice(2, 4) },
    { id: 'page-03', panels: panels.slice(4, 6) },
    { id: 'page-04', panels: panels.slice(6, 8) },
    { id: 'page-05', panels: panels.slice(8, 10) },
  ],
}

export const OPENING_STORY_VERSION = OPENING_MANGA_STORY.version
