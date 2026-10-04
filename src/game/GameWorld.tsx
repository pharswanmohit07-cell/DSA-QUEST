import { useCallback, useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { MainScene } from './scenes/MainScene'
import type { TouchDirection } from './scenes/MainScene'
import { DialogueBox } from './dialogue/DialogueBox'
import { ArrayChallenge } from './challenge/ArrayChallenge'
import { QuizChallenge } from './challenge/QuizChallenge'
import { QuestTracker } from './quests/QuestTracker'
import { TouchControls } from './TouchControls'
import { SettingsModal } from './SettingsModal'
import { getMasterVolume, setMasterVolume, startAdventureMusic, stopAllMusic } from '../audio/music'
import './gameWorld.css'

export function GameWorld({ onExitHome }: { onExitHome: () => void }) {
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const [scene, setScene] = useState<MainScene | null>(null)
  const [isMobileDevice, setIsMobileDevice] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [masterVolume, setMasterVolumeState] = useState(() => getMasterVolume())
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    const updateViewport = () => {
      setIsMobileDevice(
        'ontouchstart' in window ||
          navigator.maxTouchPoints > 0 ||
          window.innerWidth <= 768,
      )
    }

    updateViewport()
    window.addEventListener('resize', updateViewport)
    return () => {
      window.removeEventListener('resize', updateViewport)
    }
  }, [])

  useEffect(() => {
    const gameContainer = gameContainerRef.current
    if (!gameContainer) {
      return
    }

    // Start on the first frame after React commits the host div; this avoids a
    // fixed multi-hundred-millisecond wait while still guaranteeing a mounted DOM target.
    const initFrame = window.requestAnimationFrame(() => {
      const mountedContainer = document.getElementById('game-container')
      if (!mountedContainer || !mountedContainer.isConnected) {
        console.error('[DSA Quest] Phaser host #game-container is not mounted')
        return
      }
      if (gameRef.current) {
        return
      }

      try {
        // Phaser owns the canvas and game loop; React owns only this host div.
        // Pass the live element rather than resolving a string id during startup.
        const game = new Phaser.Game({
          type: Phaser.AUTO,
          parent: 'game-container',
          width: 800,
          height: 450,
          render: {
            pixelArt: true,
            roundPixels: true,
            antialias: false,
            antialiasGL: false,
          },
          backgroundColor: '#172033',
          scene: MainScene,
          physics: {
            default: 'arcade',
            arcade: {
              debug: false,
            },
          },
          scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: 800,
            height: 450,
          },
        })
        gameRef.current = game
        startAdventureMusic()

        // Hand the running scene to React so the overlay can drive the
        // conversation, which the scene owns. Emitted once the scene is up.
        game.events.once(Phaser.Core.Events.READY, () => {
          if (!game.scene.isActive('MainScene')) {
            console.info('[DSA Quest] Starting MainScene after Phaser boot')
            game.scene.start('MainScene')
          }
          const activeScene = gameRef.current?.scene.getScene('MainScene') as MainScene | undefined
          if (activeScene) {
            activeScene.onRequestExit = onExitHome
            setScene(activeScene)
          }
        })
      } catch (error) {
        console.error('[DSA Quest] Phaser game creation failed', error)
      }
    })

    return () => {
      window.cancelAnimationFrame(initFrame)
      // Phaser destruction is asynchronous, so defer startup to let Strict Mode's
      // development-only effect cleanup cancel its first, throwaway setup.
      setScene(null)
      // Destroy the renderer, input handlers, and game loop when React unmounts.
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [onExitHome])

  // Every handler below is a thin forwarder to the scene, which is the single
  // owner of conversation state.
  const handleAdvance = useCallback(() => {
    scene?.advanceDialogue()
  }, [scene])
  const handleChoose = useCallback(
    (nextNodeId: string) => {
      scene?.chooseDialogueNode(nextNodeId)
    },
    [scene],
  )
  const handleClose = useCallback(() => {
    scene?.closeDialogue()
  }, [scene])
  const handleTouchDirectionChange = useCallback(
    (direction: TouchDirection, isDown: boolean) => {
      scene?.setTouchDirection(direction, isDown)
    },
    [scene],
  )
  const handleTouchInteract = useCallback(() => {
    scene?.pressTouchInteract()
  }, [scene])
  const getDialogueAnchorPosition = useCallback(
    (npcId: string) => scene?.getDialogueAnchorPosition(npcId) ?? null,
    [scene],
  )

  const handleOpenSettings = () => {
    scene?.pauseGame()
    setSaveMessage('')
    setSettingsOpen(true)
  }

  const handleResume = () => {
    scene?.resumeGame()
    setSettingsOpen(false)
    setSaveMessage('')
  }

  const handleVolumeChange = (volume: number) => {
    setMasterVolumeState(volume)
    setMasterVolume(volume)
    if (gameRef.current) {
      gameRef.current.sound.volume = volume
    }
  }

  const handleSave = () => {
    scene?.saveGame()
    setSaveMessage('GAME SAVED')
  }

  const handleMainMenu = () => {
    stopAllMusic()
    gameRef.current?.destroy(true)
    gameRef.current = null
    setScene(null)
    setSettingsOpen(false)
    onExitHome()
  }

  return (
    <div className="game-world">
      <div id="game-container" ref={gameContainerRef} className="game-world-canvas" />
      <button
        type="button"
        className="game-settings-button"
        onClick={handleOpenSettings}
        aria-label="Open game settings"
      >
        ⚙️
      </button>
      <QuestTracker />
      <DialogueBox
        getAnchorPosition={getDialogueAnchorPosition}
        onAdvance={handleAdvance}
        onChoose={handleChoose}
        onClose={handleClose}
      />
      <QuizChallenge />
      <ArrayChallenge />
      {isMobileDevice && (
        <TouchControls
          onDirectionChange={handleTouchDirectionChange}
          onInteract={handleTouchInteract}
        />
      )}
      {settingsOpen && (
        <SettingsModal
          volume={masterVolume}
          saveMessage={saveMessage}
          onVolumeChange={handleVolumeChange}
          onSave={handleSave}
          onResume={handleResume}
          onMainMenu={handleMainMenu}
        />
      )}
    </div>
  )
}
