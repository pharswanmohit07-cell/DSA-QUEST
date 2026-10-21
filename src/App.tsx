import { useCallback, useState } from 'react'
import { HomeScreen } from './screens/HomeScreen'
import { GameWorld } from './game/GameWorld'
import { MultiplayerLobby } from './game/multiplayer/MultiplayerLobby'
import { QuestManager } from './game/quests/QuestManager'
import './App.css'

type AppScreen = 'home' | 'game' | 'multiplayer'

function App() {
  // Room links may open the multiplayer lobby, but single-player needs no account.
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

  return content
}

export default App
