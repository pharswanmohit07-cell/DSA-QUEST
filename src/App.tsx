import { useCallback, useEffect, useState } from 'react'
import { HomeScreen } from './screens/HomeScreen'
import { GameWorld } from './game/GameWorld'
import { MultiplayerLobby } from './game/multiplayer/MultiplayerLobby'
import { QuestManager } from './game/quests/QuestManager'
import { AuthModal } from './game/multiplayer/AuthModal'
import { readStoredSession, restoreOAuthSessionFromUrl, restoreSession, signOut } from './game/multiplayer/auth'
import { AccountActionsProvider } from './game/multiplayer/AccountActionsContext'
import './App.css'
import './mobileResponsive.css'

type AppScreen = 'home' | 'game' | 'multiplayer'

function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [guestMode, setGuestMode] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [accountNameOverride, setAccountNameOverride] = useState(() => {
    try {
      const session = readStoredSession()
      return session?.user.id ? localStorage.getItem(`dsa-quest-account-name:${session.user.id}`) ?? '' : ''
    } catch { return '' }
  })

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const oauthSession = await restoreOAuthSessionFromUrl()
        const session = oauthSession ?? await restoreSession()
        if (active) setAuthenticated(Boolean(session))
      } catch (error) {
        console.error('[DSA Quest] Authentication callback failed.', error)
        if (active) setAuthenticated(false)
      } finally {
        if (active) setCheckingSession(false)
      }
    })()
    return () => { active = false }
  }, [])

  useEffect(() => {
    const handlePlayerNameChanged = (event: Event) => {
      const name = (event as CustomEvent<string>).detail?.trim()
      const session = readStoredSession()
      if (!name || !session?.user.id || guestMode) return
      try { localStorage.setItem(`dsa-quest-account-name:${session.user.id}`, name) } catch { /* Keep the in-memory name if storage is blocked. */ }
      setAccountNameOverride(name)
    }
    window.addEventListener('dsaq:player-name-changed', handlePlayerNameChanged)
    return () => window.removeEventListener('dsaq:player-name-changed', handlePlayerNameChanged)
  }, [guestMode])

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

  const storedSession = readStoredSession()
  const isAdmin = String(storedSession?.user.email ?? '').toLowerCase() === 'admin@dsaquest.com'
  const guestId = (() => { try { let id = localStorage.getItem('dsa-quest-guest-id'); if (!id) { id = `GUEST-${Math.random().toString(36).slice(2, 7).toUpperCase()}`; localStorage.setItem('dsa-quest-guest-id', id) } return id } catch { return 'GUEST-PLAYER' } })()
  const displayName = guestMode ? 'Hero' : isAdmin ? 'ADMIN' : accountNameOverride || String(storedSession?.user.user_metadata?.display_name ?? storedSession?.user.email?.split('@')[0] ?? 'Adventurer')
  const logout = useCallback(async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await signOut(readStoredSession())
    } finally {
      setAuthenticated(false)
      setGuestMode(false)
      setAccountNameOverride('')
      setIsLoggingOut(false)
      setScreen('home')
    }
  }, [isLoggingOut])

  const content = screen === 'home'
    ? <HomeScreen isAdmin={isAdmin} guestMode={guestMode} isAuthenticated={authenticated && !guestMode} displayName={displayName} onRequestLogin={() => setAuthModalOpen(true)} onStartGame={startNewGame} onContinueGame={continueGame} onOpenMultiplayer={() => setScreen('multiplayer')} />
    : screen === 'multiplayer'
      ? guestMode
        ? <>
            <HomeScreen guestMode displayName={displayName} onRequestLogin={() => setAuthModalOpen(true)} onStartGame={startNewGame} onContinueGame={continueGame} onOpenMultiplayer={() => setScreen('multiplayer')} />
            <AuthModal onClose={() => { setGuestMode(false); setScreen('home') }} onGuest={() => { setScreen('home'); setGuestMode(true) }} />
          </>
        : <>
            <HomeScreen isAdmin={isAdmin} displayName={displayName} onStartGame={startNewGame} onContinueGame={continueGame} onOpenMultiplayer={() => setScreen('multiplayer')} />
            <MultiplayerLobby onBack={returnHome} onPlay={() => setScreen('game')} />
          </>
      : <main className="app-shell"><GameWorld isAdmin={isAdmin && authenticated && !guestMode} playerName={displayName} onExitHome={returnHome} /></main>

  if (!authenticated) {
    return (
      <div className="dq-auth-scene">
        <div className="dq-auth-world-preview" aria-hidden="true">
          <HomeScreen
            onStartGame={() => undefined}
            onContinueGame={() => undefined}
            displayName={guestId}
            onOpenMultiplayer={() => undefined}
          />
        </div>
        {!checkingSession && <AuthModal onClose={() => { setGuestMode(false); setAuthenticated(true) }} onGuest={() => { setGuestMode(true); setScreen('home'); setAuthenticated(true) }} />}
        {checkingSession && <div className="dq-auth-loading" aria-label="Checking sign-in status" />}
      </div>
    )
  }

  // Render exactly one screen at a time. The menu has its own village artwork;
  // mounting GameWorld behind it creates a second, overlapping gameplay scene.
  return (
    <AccountActionsProvider value={{ displayName, isLoggingOut, logout }}>
      {content}
      {authModalOpen && <AuthModal onClose={() => { setAuthModalOpen(false); setGuestMode(false); setAuthenticated(Boolean(readStoredSession())) }} onGuest={() => setAuthModalOpen(false)} />}
    </AccountActionsProvider>
  )
}

export default App
