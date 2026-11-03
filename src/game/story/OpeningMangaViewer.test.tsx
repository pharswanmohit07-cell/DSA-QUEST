import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OPENING_MANGA_STORY } from './openingMangaManifest'
import type { OpeningMangaStory } from './openingMangaManifest'
import { OpeningMangaViewer } from './OpeningMangaViewer'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const alternateStory: OpeningMangaStory = {
  version: 'sample-flexibility-test',
  title: 'Alternate Sample Story',
  pages: [
    {
      id: 'alternate-page-a',
      panels: [
        {
          id: 'alternate-panel-1',
          filename: 'alternate-01.png',
          src: '/sample/alternate-01.png',
          narration: 'First page narration.',
          caption: 'An optional first-page caption.',
        },
      ],
    },
    {
      id: 'alternate-page-b',
      panels: [
        {
          id: 'alternate-panel-2',
          filename: 'alternate-02.png',
          src: '/sample/alternate-02.png',
          dialogue: { speaker: 'Sample speaker', text: 'Dialogue stays in the UI.' },
        },
        {
          id: 'alternate-panel-3',
          filename: 'alternate-03.png',
          src: '/sample/alternate-03.png',
          narration: 'Third panel narration.',
        },
        {
          id: 'alternate-panel-4',
          filename: 'alternate-04.png',
          src: '/sample/alternate-04.png',
          caption: 'A standalone caption.',
        },
      ],
    },
    {
      id: 'alternate-page-c',
      panels: [
        {
          id: 'alternate-panel-5',
          filename: 'alternate-05.png',
          src: '/sample/alternate-05.png',
        },
        {
          id: 'alternate-panel-6',
          filename: 'alternate-06.png',
          src: '/sample/alternate-06.png',
        },
      ],
    },
  ],
}

let host: HTMLDivElement
let root: Root

function mountViewer(
  usePlaceholders = true,
  onExitStory = vi.fn(() => true),
  story = OPENING_MANGA_STORY,
) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => {
    root.render(
      <OpeningMangaViewer
        usePlaceholders={usePlaceholders}
        onExitStory={onExitStory}
        story={story}
      />,
    )
  })
  return onExitStory
}

function clickButton(name: string | RegExp) {
  const button = Array.from(host.querySelectorAll('button')).find((candidate) =>
    typeof name === 'string'
      ? candidate.getAttribute('aria-label') === name || candidate.textContent?.trim() === name
      : name.test(candidate.textContent ?? ''),
  )
  if (!button) throw new Error(`Button not found: ${String(name)}`)
  act(() => button.click())
}

afterEach(() => {
  if (root) act(() => root.unmount())
  host?.remove()
})

describe('opening manga viewer', () => {
  it('keeps the draft story panel references in manifest reading order', () => {
    const panels = OPENING_MANGA_STORY.pages.flatMap((page) => page.panels)
    expect(OPENING_MANGA_STORY.title).toBe('The Shattering of Seven')
    expect(OPENING_MANGA_STORY.pages).toHaveLength(5)
    expect(panels).toHaveLength(10)
    expect(panels.map((panel) => panel.filename))
      .toEqual(Array.from({ length: 10 }, (_, index) =>
        `opening-panel-${String(index + 1).padStart(2, '0')}.png`,
      ))
    expect(panels.map((panel) => panel.src))
      .toEqual(Array.from({ length: 10 }, (_, index) =>
        `/assets/opening-manga/opening-panel-${String(index + 1).padStart(2, '0')}.png`,
      ))
    expect(panels.every((panel) =>
      panel.narration === 'Story copy pending approval.' &&
      panel.dialogue?.text === 'Story copy pending approval.',
    )).toBe(true)
  })

  it('moves between pages and disables previous and next at the correct boundaries', () => {
    mountViewer()

    expect(host.querySelector('.opening-manga-page')?.getAttribute('aria-label')).toBe('Page 1 of 5')
    expect(host.querySelector<HTMLButtonElement>('[aria-label="Previous page"]')?.disabled).toBe(true)

    clickButton('Next page')
    expect(host.querySelector('.opening-manga-page')?.getAttribute('aria-label')).toBe('Page 2 of 5')
    expect(host.querySelector<HTMLButtonElement>('[aria-label="Previous page"]')?.disabled).toBe(false)

    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })))
    expect(host.querySelector('.opening-manga-page')?.getAttribute('aria-label')).toBe('Page 1 of 5')
  })

  it('renders and navigates an alternate story with irregular panel counts', () => {
    const onExit = vi.fn(() => true)
    mountViewer(true, onExit, alternateStory)

    expect(host.querySelector('#opening-manga-title')?.textContent).toBe('Alternate Sample Story')
    expect(host.querySelector('.opening-manga-page')?.getAttribute('aria-label')).toBe('Page 1 of 3')
    expect(host.querySelectorAll('.opening-manga-panel')).toHaveLength(1)
    expect(host.querySelector('.opening-manga-panel')?.getAttribute('data-panel-id'))
      .toBe('alternate-panel-1')
    expect(host.textContent).toContain('An optional first-page caption.')

    clickButton('Next page')
    expect(host.querySelector('.opening-manga-page')?.getAttribute('aria-label')).toBe('Page 2 of 3')
    expect(Array.from(host.querySelectorAll('.opening-manga-panel')).map((panel) =>
      panel.getAttribute('data-panel-id'),
    )).toEqual(['alternate-panel-2', 'alternate-panel-3', 'alternate-panel-4'])
    expect(host.querySelectorAll('.opening-manga-panel')).toHaveLength(3)
    expect(host.textContent).toContain('Sample speaker')
    expect(host.textContent).toContain('Dialogue stays in the UI.')

    clickButton('Next page')
    expect(host.querySelector('.opening-manga-page')?.getAttribute('aria-label')).toBe('Page 3 of 3')
    expect(Array.from(host.querySelectorAll('.opening-manga-panel')).map((panel) =>
      panel.getAttribute('data-panel-id'),
    )).toEqual(['alternate-panel-5', 'alternate-panel-6'])
    expect(host.querySelector('.opening-manga-page-count')?.textContent).toBe('Page 3 / 3')

    clickButton('Next page and enter village')
    expect(onExit).toHaveBeenCalledWith('completed')
  })

  it('exits as skipped when Skip Story is activated and guards duplicate exits', () => {
    const onExit = mountViewer()

    clickButton('Skip Story')
    clickButton('Skip Story')

    expect(onExit).toHaveBeenCalledTimes(1)
    expect(onExit).toHaveBeenCalledWith('skipped')
  })

  it('uses Escape to skip the story', () => {
    const onExit = mountViewer()

    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))

    expect(onExit).toHaveBeenCalledWith('skipped')
  })

  it('completes only when Next is pressed on the final page', () => {
    const onExit = mountViewer()

    for (let page = 1; page < OPENING_MANGA_STORY.pages.length; page += 1) {
      clickButton('Next page')
    }
    const finalPageNumber = OPENING_MANGA_STORY.pages.length
    expect(host.querySelector('.opening-manga-page')?.getAttribute('aria-label'))
      .toBe(`Page ${finalPageNumber} of ${finalPageNumber}`)
    expect(onExit).not.toHaveBeenCalled()

    clickButton('Next page and enter village')
    expect(onExit).toHaveBeenCalledTimes(1)
    expect(onExit).toHaveBeenCalledWith('completed')
  })

  it('shows numbered development placeholders instead of broken images in preview mode', () => {
    mountViewer(true)

    expect(host.querySelectorAll('img')).toHaveLength(0)
    expect(host.querySelectorAll('.is-development-placeholder'))
      .toHaveLength(OPENING_MANGA_STORY.pages[0].panels.length)
    expect(host.textContent).toContain('Development placeholder — not final artwork')
  })

  it('replaces a failed artwork image with an accessible fallback', () => {
    mountViewer(false)
    const image = host.querySelector<HTMLImageElement>('[data-panel-number="1"] img')
    expect(image).not.toBeNull()
    expect(host.querySelector('[data-panel-number="1"] .opening-manga-loading')).not.toBeNull()

    act(() => image?.dispatchEvent(new Event('error')))

    expect(host.querySelector('[data-panel-number="1"] img')).toBeNull()
    expect(host.querySelector('[aria-label="Artwork unavailable for panel 1"]')).not.toBeNull()
    expect(host.textContent).toContain('Artwork unavailable')
  })

  it('clears the loading state when an illustration loads', () => {
    mountViewer(false)
    const image = host.querySelector<HTMLImageElement>('[data-panel-number="1"] img')
    expect(host.querySelector('[data-panel-number="1"] .opening-manga-loading')).not.toBeNull()

    act(() => image?.dispatchEvent(new Event('load')))

    expect(host.querySelector('[data-panel-number="1"] .opening-manga-loading')).toBeNull()
  })
})
