import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { GameOverlayBoundary, GameOverlayFallback } from './GameOverlayFallback'

describe('game overlay loading boundaries', () => {
  it('renders a polite accessible status fallback', () => {
    const html = renderToStaticMarkup(createElement(GameOverlayFallback, { label: 'Loading dialogue', compact: true }))

    expect(html).toContain('role="status"')
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('Loading dialogue')
    expect(html).toContain('game-overlay-fallback--compact')
  })

  it('keeps an unrelated overlay visible while one boundary is suspended', () => {
    const pending = new Promise<void>(() => undefined)
    function WaitingChallenge(): never {
      throw pending
    }

    const html = renderToStaticMarkup(
      <>
        <div>Quest tracker remains visible</div>
        <GameOverlayBoundary label="Loading dialogue" compact>
          <div>Dialogue content</div>
        </GameOverlayBoundary>
        <GameOverlayBoundary label="Loading challenge">
          <WaitingChallenge />
        </GameOverlayBoundary>
      </>,
    )

    expect(html).toContain('Quest tracker remains visible')
    expect(html).toContain('Dialogue content')
    expect(html).toContain('Loading challenge')
  })
})
