import { Suspense, type ReactNode } from 'react'

type GameOverlayFallbackProps = {
  label: string
  compact?: boolean
}

type GameOverlayBoundaryProps = GameOverlayFallbackProps & {
  children: ReactNode
}

export function GameOverlayFallback({ label, compact = false }: GameOverlayFallbackProps) {
  return (
    <div
      className={compact ? 'game-overlay-fallback game-overlay-fallback--compact' : 'game-overlay-fallback'}
      role="status"
      aria-live="polite"
    >
      <span>{label}</span>
    </div>
  )
}

/** Keeps one lazy overlay from suspending or blanking its sibling overlays. */
export function GameOverlayBoundary({ children, label, compact = false }: GameOverlayBoundaryProps) {
  return (
    <Suspense fallback={<GameOverlayFallback label={label} compact={compact} />}>
      {children}
    </Suspense>
  )
}
