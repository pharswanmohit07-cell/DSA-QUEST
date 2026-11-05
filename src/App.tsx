import { useCallback, useEffect, useRef, useState } from 'react'
import { HomeScreen } from './screens/HomeScreen'
import { GameWorld } from './game/GameWorld'
import { MultiplayerLobby } from './game/multiplayer/MultiplayerLobby'
import { QuestManager } from './game/quests/QuestManager'
import { AuthModal } from './game/multiplayer/AuthModal'
import { readStoredSession, restoreOAuthSessionFromUrl, restoreSession, signOut } from './game/multiplayer/auth'
import { AccountActionsProvider } from './game/multiplayer/AccountActionsContext'
import { OpeningMangaViewer } from './game/story/OpeningMangaViewer'
import { OPENING_STORY_VERSION } from './game/story/openingMangaManifest'
import { getOpeningMangaDestination, isOpeningMangaPreviewRequested } from './game/story/openingMangaFlow'
import './App.css'
import './mobileResponsive.css'

type AppScreen = 'home' | 'game' | 'multiplayer' | 'opening-story' | 'opening-story-preview'

function App() {
  const openingStoryReady = import.meta.env.VITE_OPENING_MANGA_READY === 'true'
  const previewRequested = isOpeningMangaPreviewRequested(import.meta.env.DEV, window.location.search)
  const [authenticated, setAuthenticated] = useState(false)
  const [guestMode, setGuestMode] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [newAdventureError, setNewAdventureError] = useState('')
  const [accountNameOverride, setAccountNameOverride] = useState(() => {
    try {
      const session = readStoredSession()
      return session?.user.id ? localStorage.getItem(`dsa-quest-account-name:${session.user.id}`) ?? '' : ''
    } catch { return '' }
  })
  const [storyExitError, setStoryExitError] = useState('')
  const gameTransitionedRef = useRef(false)
  const launchStartedRef = useRef(false)

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

  const [screen, setScreen] = useState<AppScreen>(() => previewRequested
    ? 'opening-story-preview'
    : new URLSearchParams(window.location.search).has('room') ? 'multiplayer' : 'home')

  const startNewGame = useCallback((): boolean => {
    if (launchStartedRef.current) return true
    launchStartedRef.current = true
    setNewAdventureError('')
    if (!QuestManager.clearSave()) {
      launchStartedRef.current = false
      setNewAdventureError('The existing save could not be cleared. No new adventure was started.')
      return false
    }
    gameTransitionedRef.current = false
    QuestManager.reset()
    setStoryExitError('')
    const destination = getOpeningMangaDestination(
      'new',
      QuestManager.getCampaign().openingStory.status,
      openingStoryReady,
    )
    setScreen(destination)
    return true
  }, [openingStoryReady])

  const continueGame = useCallback(() => {
    if (launchStartedRef.current) return
    launchStartedRef.current = true
    gameTransitionedRef.current = false
    const destination = getOpeningMangaDestination(
      'continue',
      QuestManager.getCampaign().openingStory.status,
      openingStoryReady,
    )
    setScreen(destination)
  }, [openingStoryReady])

  const enterVillage = useCallback(() => {
    if (gameTransitionedRef.current) return
    gameTransitionedRef.current = true
    setScreen('game')
  }, [])

  const finishOpeningStory = useCallback((outcome: 'completed' | 'skipped'): boolean => {
    if (screen === 'opening-story-preview') {
      setStoryExitError('')
      setScreen('home')
      return true
    }

    const recorded = QuestManager.markOpeningStorySeen(outcome, OPENING_STORY_VERSION)
    const persisted = recorded && QuestManager.getSave()?.openingStory.status === outcome
    if (!persisted) {
      setStoryExitError('The story status could not be saved. Please try again before entering the village.')
      return false
    }

    setStoryExitError('')
    enterVillage()
    return true
  }, [enterVillage, screen])

  const returnHome = useCallback(() => {
    launchStartedRef.current = false
    gameTransitionedRef.current = false
    setScreen('home')
  }, [])

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
    ? <HomeScreen isAdmin={isAdmin} guestMode={guestMode} isAuthenticated={authenticated && !guestMode} displayName={displayName} newAdventureError={newAdventureError} onRequestLogin={() => setAuthModalOpen(true)} onStartGame={startNewGame} onContinueGame={continueGame} onOpenMultiplayer={() => setScreen('multiplayer')} />
    : screen === 'opening-story' || screen === 'opening-story-preview'
      ? <OpeningMangaViewer
          usePlaceholders={screen === 'opening-story-preview' || !openingStoryReady}
          errorMessage={storyExitError}
          onExitStory={finishOpeningStory}
        />
    : screen === 'multiplayer'
      ? guestMode
        ? <>
            <HomeScreen guestMode displayName={displayName} newAdventureError={newAdventureError} onRequestLogin={() => setAuthModalOpen(true)} onStartGame={startNewGame} onContinueGame={continueGame} onOpenMultiplayer={() => setScreen('multiplayer')} />
            <AuthModal onClose={() => { setGuestMode(false); setScreen('home') }} onGuest={() => { setScreen('home'); setGuestMode(true) }} />
          </>
        : <>
            <HomeScreen isAdmin={isAdmin} displayName={displayName} newAdventureError={newAdventureError} onStartGame={startNewGame} onContinueGame={continueGame} onOpenMultiplayer={() => setScreen('multiplayer')} />
            <MultiplayerLobby onBack={returnHome} onPlay={() => setScreen('game')} />
          </>
      : <main className="app-shell"><GameWorld isAdmin={isAdmin && authenticated && !guestMode} isAuthenticated={authenticated && !guestMode} onRequestLogin={() => setAuthModalOpen(true)} playerName={displayName} onExitHome={returnHome} /></main>

  if (!authenticated) {
    return (
      <div className="dq-auth-scene">
        <div className="dq-auth-world-preview" aria-hidden="true">
          <HomeScreen
            onStartGame={() => true}
            onContinueGame={() => undefined}
            displayName={guestId}
            onOpenMultiplayer={() => undefined}
          />
        </div>
        {!checkingSession && <AuthModal onClose={() => { setGuestMode(false); setAuthenticated(true); if (previewRequested) setScreen('opening-story-preview') }} onGuest={() => { setGuestMode(true); setScreen(previewRequested ? 'opening-story-preview' : 'home'); setAuthenticated(true) }} />}
        {checkingSession && <div className="dq-auth-loading" aria-label="Checking sign-in status" />}
      </div>
    )
  }

  // Render exactly one screen at a time. The menu has its own village artwork;
  // mounting GameWorld behind it creates a second, overlapping gameplay scene.
  return (
    <AccountActionsProvider value={{ displayName, isLoggingOut, logout }}>
      <div key={screen} className={`app-screen-transition app-screen-transition-${screen}`}>
        {content}
      </div>
      {authModalOpen && <AuthModal onClose={() => { setAuthModalOpen(false); setGuestMode(false); setAuthenticated(Boolean(readStoredSession())) }} onGuest={() => setAuthModalOpen(false)} />}
    </AccountActionsProvider>
  )
}

export default App
