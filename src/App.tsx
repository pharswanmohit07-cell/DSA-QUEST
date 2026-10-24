import { useCallback, useEffect, useState } from 'react'
import { HomeScreen } from './screens/HomeScreen'
import { GameWorld } from './game/GameWorld'
import { MultiplayerLobby } from './game/multiplayer/MultiplayerLobby'
import { QuestManager } from './game/quests/QuestManager'
import { AuthModal } from './game/multiplayer/AuthModal'
import { restoreOAuthSessionFromUrl, restoreSession } from './game/multiplayer/auth'
import './App.css'

type AppScreen = 'home' | 'game' | 'multiplayer'

function App() {
  const [authOpen, setAuthOpen] = useState(true)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const oauthSession = await restoreOAuthSessionFromUrl()
        const session = oauthSession ?? await restoreSession()
        if (active && session) setAuthOpen(false)
      } catch (error) {
        console.error('[DSA Quest] Authentication callback failed.', error)
      }
    })()
    return () => { active = false }
  }, [])

  // Room links and multiplayer navigation are unchanged by the auth modal.
  const [screen, setScreen] = useState<AppScreen>(() =>
    new URLSearchParams(window.location.search).has('room') ? 'multiplayer' : 'home',
  )

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

  const content = screen === 'home'
    ? <HomeScreen onStartGame={startNewGame} onContinueGame={continueGame} onOpenMultiplayer={() => setScreen('multiplayer')} />
    : screen === 'multiplayer'
      ? <MultiplayerLobby onBack={returnHome} onPlay={() => setScreen('game')} />
      : <main className="app-shell"><GameWorld onExitHome={returnHome} /></main>

  return <>
    {content}
    {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
  </>
}

export default App
