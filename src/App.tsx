import { useCallback, useEffect, useState } from 'react'
import { HomeScreen } from './screens/HomeScreen'
import { GameWorld } from './game/GameWorld'
import { MultiplayerLobby } from './game/multiplayer/MultiplayerLobby'
import { QuestManager } from './game/quests/QuestManager'
import { AuthModal } from './game/multiplayer/AuthModal'
import { readStoredSession, restoreOAuthSessionFromUrl, restoreSession, signOut } from './game/multiplayer/auth'
import { AccountActionsProvider } from './game/multiplayer/AccountActionsContext'
import './App.css'

type AppScreen = 'home' | 'game' | 'multiplayer'

function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [session, setSession] = useState(() => readStoredSession())
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const oauthSession = await restoreOAuthSessionFromUrl()
        const session = oauthSession ?? await restoreSession()
        if (active) {
          setSession(session)
          setAuthenticated(Boolean(session))
        }
      } catch (error) {
        console.error('[DSA Quest] Authentication callback failed.', error)
        if (active) {
          setSession(null)
          setAuthenticated(false)
        }
      } finally {
        if (active) setCheckingSession(false)
      }
    })()
    return () => { active = false }
  }, [])

  const [screen, setScreen] = useState<AppScreen>(() =>
    new URLSearchParams(window.location.search).has('room') ? 'multiplayer' : 'home',
  )

  const startNewGame = useCallback(() => {
    QuestManager.reset()
    QuestManager.clearSave()
    setScreen('game')
  }, [])

  const continueGame = useCallback(() => setScreen('game'), [])
  const returnHome = useCallback(() => setScreen('home'), [])

  const content = screen === 'home'
    ? <HomeScreen onStartGame={startNewGame} onContinueGame={continueGame} onOpenMultiplayer={() => setScreen('multiplayer')} />
    : screen === 'multiplayer'
      ? <MultiplayerLobby onBack={returnHome} onPlay={() => setScreen('game')} />
      : <main className="app-shell"><GameWorld onExitHome={returnHome} /></main>

  if (!authenticated) {
    return (
      <div className="dq-auth-scene">
        <div className="dq-auth-world-preview" aria-hidden="true">
          <HomeScreen
            onStartGame={() => undefined}
            onContinueGame={() => undefined}
            onOpenMultiplayer={() => undefined}
          />
        </div>
        {!checkingSession && <AuthModal onClose={() => { setSession(readStoredSession()); setAuthenticated(true) }} />}
        {checkingSession && <div className="dq-auth-loading" aria-label="Checking sign-in status" />}
      </div>
    )
  }

  // Render exactly one screen at a time. The menu has its own village artwork;
  // mounting GameWorld behind it creates a second, overlapping gameplay scene.
  const logout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await signOut(session)
    } finally {
      setSession(null)
      setAuthenticated(false)
      setScreen('home')
      setIsLoggingOut(false)
    }
  }
  const displayName = String(session?.user.user_metadata?.display_name ?? session?.user.user_metadata?.full_name ?? session?.user.email?.split('@')[0] ?? 'Adventurer').trim()

  return (
    <AccountActionsProvider value={{ displayName, isLoggingOut, logout }}>
      {content}
    </AccountActionsProvider>
  )
}

export default App
