import { useCallback, useState } from 'react'
import { HomeScreen } from './screens/HomeScreen'
import { GameWorld } from './game/GameWorld'
import { MultiplayerLobby } from './game/multiplayer/MultiplayerLobby'
import { QuestManager } from './game/quests/QuestManager'
import './App.css'

type AppScreen = 'home' | 'game' | 'multiplayer'

function App() {
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

  if (screen === 'home') {
    return <HomeScreen onStartGame={startNewGame} onContinueGame={continueGame} onOpenMultiplayer={() => setScreen('multiplayer')} />
  }

  if (screen === 'multiplayer') {
    return <MultiplayerLobby onBack={returnHome} onPlay={() => setScreen('game')} />
  }

  return (
    <main className="app-shell">
      <GameWorld onExitHome={returnHome} />
    </main>
  )
}

export default App
