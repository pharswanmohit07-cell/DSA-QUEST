import { useEffect, useState, type ReactNode } from 'react'

type GameLoadingOverlayProps = {
  children: ReactNode
  onExitHome: () => void
}

export function GameLoadingOverlay({ children, onExitHome }: GameLoadingOverlayProps) {
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const handleProgress = (event: Event) => {
      const value = (event as CustomEvent<number>).detail
      if (Number.isFinite(value)) {
        const scaled = 0.35 + Math.max(0, Math.min(1, value)) * 0.65
        setProgress((previous) => Math.max(previous ?? 0, scaled))
      }
    }
    const handleAssetProgress = (event: Event) => {
      const value = (event as CustomEvent<number>).detail
      if (Number.isFinite(value)) {
        const scaled = Math.max(0, Math.min(1, value)) * 0.35
        setProgress((previous) => Math.max(previous ?? 0, scaled))
      }
    }
    const handleReady = () => {
      setLoading(false)
    }
    const handleError = (event: Event) => {
      setError((event as CustomEvent<string>).detail || 'The village could not be initialized.')
      setLoading(false)
    }

    window.addEventListener('dsaq:asset-progress', handleAssetProgress)
    window.addEventListener('dsaq:loading-progress', handleProgress)
    window.addEventListener('dsaq:world-ready', handleReady)
    window.addEventListener('dsaq:world-error', handleError)
    return () => {
      window.removeEventListener('dsaq:asset-progress', handleAssetProgress)
      window.removeEventListener('dsaq:loading-progress', handleProgress)
      window.removeEventListener('dsaq:world-ready', handleReady)
      window.removeEventListener('dsaq:world-error', handleError)
    }
  }, [])

  return (
    <div className="game-loading-shell">
      {children}
      {loading && (
        <div className="game-loading-overlay" role="status" aria-live="polite">
          <div className="game-loading-card">
            <strong>LOADING DSA QUEST...</strong>
            {progress !== null && <span>{Math.round(progress * 100)}%</span>}
          </div>
        </div>
      )}
      {error && (
        <div className="game-loading-overlay" role="alert">
          <div className="game-loading-card game-loading-error">
            <strong>DSA QUEST COULD NOT START</strong>
            <span>{error}</span>
            <button type="button" onClick={onExitHome}>RETURN TO MENU</button>
          </div>
        </div>
      )}
    </div>
  )
}
