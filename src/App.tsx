import { useCallback, useEffect, useState } from 'react'
import { HomeScreen } from './screens/HomeScreen'
import { GameWorld } from './game/GameWorld'
import { QuestManager } from './game/quests/QuestManager'
import './App.css'

type AppScreen = 'home' | 'game'

function App() {
  const [screen, setScreen] = useState<AppScreen>('home')

  useEffect(() => {
    const requestLandscape = () => {
      const orientation = globalThis.screen.orientation
      if (orientation?.lock) {
        void orientation.lock('landscape').catch(() => {
          // CSS rotation below is the fallback when the browser requires fullscreen.
        })
      }
    }

    requestLandscape()
    window.addEventListener('pointerdown', requestLandscape, { once: true })
    window.addEventListener('touchstart', requestLandscape, { once: true, passive: true })
    return () => {
      window.removeEventListener('pointerdown', requestLandscape)
      window.removeEventListener('touchstart', requestLandscape)
    }
  }, [])

  const startNewGame = useCallback(() => {
    QuestManager.reset()
    QuestManager.clearSave()
    setScreen('game')
  }, [])

  const continueGame = useCallback(() => {
    setScreen('game')
  }, [])

  const returnHome = useCallback(() => {
    setScreen('home')
  }, [])

  if (screen === 'home') {
    return <HomeScreen onStartGame={startNewGame} onContinueGame={continueGame} />
  }

  return (
    <main className="app-shell">
      <GameWorld onExitHome={returnHome} />
    </main>
  )
}

export default App
