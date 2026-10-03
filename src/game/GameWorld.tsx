import { useCallback, useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { MainScene } from './scenes/MainScene'
import { DialogueBox } from './dialogue/DialogueBox'
import { ArrayChallenge } from './challenge/ArrayChallenge'
import { QuizChallenge } from './challenge/QuizChallenge'
import { QuestTracker } from './quests/QuestTracker'

export function GameWorld() {
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const [scene, setScene] = useState<MainScene | null>(null)

  useEffect(() => {
    const gameContainer = gameContainerRef.current
    if (!gameContainer) {
      return
    }

    // Phaser destruction is asynchronous, so defer startup to let Strict Mode's
    // development-only effect cleanup cancel its first, throwaway setup.
    const initTimeout = window.setTimeout(() => {
      if (gameRef.current) {
        return
      }

      // Phaser owns the canvas and game loop; React owns only this host div.
      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: gameContainer,
        width: '100%',
        height: '100%',
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
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
      })

      // Hand the running scene to React so the overlay can drive the
      // conversation, which the scene owns. Emitted once the scene is up.
      gameRef.current.events.once(Phaser.Core.Events.READY, () => {
        const activeScene = gameRef.current?.scene.getScene('MainScene') as MainScene | undefined
        if (activeScene) {
          setScene(activeScene)
        }
      })
    }, 0)

    return () => {
      window.clearTimeout(initTimeout)
      // Phaser destruction is asynchronous, so defer startup to let Strict Mode's
      // development-only effect cleanup cancel its first, throwaway setup.
      setScene(null)
      // Destroy the renderer, input handlers, and game loop when React unmounts.
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

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
  const getDialogueAnchorPosition = useCallback(
    (npcId: string) => scene?.getDialogueAnchorPosition(npcId) ?? null,
    [scene],
  )

  return (
    <div className="game-world">
      <div ref={gameContainerRef} className="game-world-canvas" />
      <QuestTracker />
      <DialogueBox
        getAnchorPosition={getDialogueAnchorPosition}
        onAdvance={handleAdvance}
        onChoose={handleChoose}
        onClose={handleClose}
      />
      <QuizChallenge />
      <ArrayChallenge />
    </div>
  )
}
