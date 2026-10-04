import { useCallback, useState } from 'react'
import { HomeScreen } from './screens/HomeScreen'
import { GameWorld } from './game/GameWorld'
import { QuestManager } from './game/quests/QuestManager'
import './App.css'

type AppScreen = 'home' | 'game'

function App() {
  const [screen, setScreen] = useState<AppScreen>('home')

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
    return <HomeScreen onPlay={startNewGame} onContinue={continueGame} />
  }

  return (
    <main className="app-shell">
      <GameWorld onExitHome={returnHome} />
    </main>
  )
}

export default App
