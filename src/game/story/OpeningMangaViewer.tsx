import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  OpeningMangaPanel as OpeningMangaPanelData,
  OpeningMangaStory,
  OpeningStoryOutcome,
} from './openingMangaManifest'
import { OPENING_MANGA_STORY } from './openingMangaManifest'
import './openingMangaViewer.css'

type OpeningMangaViewerProps = {
  usePlaceholders: boolean
  errorMessage?: string
  onExitStory: (outcome: OpeningStoryOutcome) => boolean
  story?: OpeningMangaStory
}

function MangaPanel({
  panel,
  panelNumber,
  usePlaceholder,
}: {
  panel: OpeningMangaPanelData
  panelNumber: number
  usePlaceholder: boolean
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const copy = panel.narration || panel.dialogue || panel.caption
    ? (
      <figcaption className="opening-manga-copy">
        {panel.narration && <p><span>Narration</span>{panel.narration}</p>}
        {panel.dialogue && (
          <p>
            <span>Dialogue{panel.dialogue.speaker ? ` — ${panel.dialogue.speaker}` : ''}</span>
            {panel.dialogue.text}
          </p>
        )}
        {panel.caption && <p className="opening-manga-caption"><span>Caption</span>{panel.caption}</p>}
      </figcaption>
    )
    : null

  return (
    <figure className="opening-manga-panel" data-panel-id={panel.id} data-panel-number={panelNumber}>
      {usePlaceholder || imageFailed ? (
        <div
          className={`opening-manga-art-fallback${usePlaceholder ? ' is-development-placeholder' : ''}`}
          role="img"
          aria-label={
            usePlaceholder
              ? `Development placeholder for panel ${panelNumber}`
              : `Artwork unavailable for panel ${panelNumber}`
          }
        >
          <span className="opening-manga-panel-number">
            {String(panelNumber).padStart(2, '0')}
          </span>
          <span>
            {usePlaceholder
              ? 'Development placeholder — not final artwork'
              : 'Artwork unavailable'}
          </span>
        </div>
      ) : (
        <img
          className="opening-manga-art"
          src={panel.src}
          alt={panel.caption || `Opening story illustration, panel ${panelNumber}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageFailed(true)}
        />
      )}
      {!usePlaceholder && !imageFailed && !imageLoaded && (
        <div className="opening-manga-loading" role="status">
          Loading panel {String(panelNumber).padStart(2, '0')}…
        </div>
      )}
      {copy}
    </figure>
  )
}

export function OpeningMangaViewer({
  usePlaceholders,
  errorMessage,
  onExitStory,
  story = OPENING_MANGA_STORY,
}: OpeningMangaViewerProps) {
  const [pageIndex, setPageIndex] = useState(0)
  const exitingRef = useRef(false)
  const exitPendingRef = useRef(false)
  const isFirstPage = pageIndex === 0
  const isLastPage = story.pages.length > 0 && pageIndex === story.pages.length - 1

  const finish = useCallback((outcome: OpeningStoryOutcome) => {
    if (exitingRef.current || exitPendingRef.current) return
    exitPendingRef.current = true
    const exited = onExitStory(outcome)
    exitPendingRef.current = false
    if (exited) exitingRef.current = true
  }, [onExitStory])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && !isFirstPage) {
        event.preventDefault()
        setPageIndex((index) => Math.max(0, index - 1))
      } else if (event.key === 'ArrowRight' && story.pages.length > 0 && !isLastPage) {
        event.preventDefault()
        setPageIndex((index) => Math.min(story.pages.length - 1, index + 1))
      } else if (event.key === 'Escape') {
        event.preventDefault()
        finish('skipped')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [finish, isFirstPage, isLastPage, story.pages.length])

  const page = story.pages[pageIndex]
  const panelNumberOffset = story.pages
    .slice(0, pageIndex)
    .reduce((total, previousPage) => total + previousPage.panels.length, 0)

  return (
    <main className="opening-manga" aria-labelledby="opening-manga-title">
      <header className="opening-manga-header">
        <p className="opening-manga-kicker">OPENING STORY</p>
        <h1 id="opening-manga-title">{story.title}</h1>
      </header>

      <section
        className="opening-manga-page"
        aria-label={`Page ${page ? pageIndex + 1 : 0} of ${story.pages.length}`}
        aria-live="polite"
      >
        {page
          ? page.panels.map((panel, index) => (
              <MangaPanel
                key={panel.id}
                panel={panel}
                panelNumber={panelNumberOffset + index + 1}
                usePlaceholder={usePlaceholders}
              />
            ))
          : <p className="opening-manga-empty">No story pages are configured yet.</p>}
      </section>

      {errorMessage && <p className="opening-manga-error" role="alert">{errorMessage}</p>}

      <footer className="opening-manga-controls">
        <button
          type="button"
          className="opening-manga-skip"
          onClick={() => finish('skipped')}
        >
          Skip Story
        </button>
        <p className="opening-manga-page-count" aria-live="polite">
          Page {page ? pageIndex + 1 : 0} / {story.pages.length}
        </p>
        <div className="opening-manga-navigation">
          <button
            type="button"
            onClick={() => setPageIndex((index) => Math.max(0, index - 1))}
            disabled={isFirstPage || story.pages.length === 0}
            aria-label="Previous page"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => {
              if (isLastPage) finish('completed')
              else if (story.pages.length > 0) setPageIndex((index) => Math.min(story.pages.length - 1, index + 1))
            }}
            disabled={story.pages.length === 0}
            aria-label={isLastPage ? 'Next page and enter village' : 'Next page'}
          >
            Next page
          </button>
        </div>
      </footer>
    </main>
  )
}
