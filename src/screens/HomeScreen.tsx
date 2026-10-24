import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import './homeScreen.css'
import { SettingsScreen } from './SettingsScreen'
import type { Settings } from './SettingsScreen'
import { QuestManager } from '../game/quests/QuestManager'
import { preloadGameAssets } from '../game/preloadGameAssets'
import { warmVillageTileExtrusionCache } from '../game/scenes/MainScene'
import {
  muteHomeMusic,
  setMusicVolume,
  startHomeMusic,
  stopAllMusic,
  unmuteHomeMusic,
} from '../audio/music'

export type HomeScreenProps = {
  onStartGame: () => void
  onContinueGame: () => void
  onOpenMultiplayer: () => void
}

const SETTINGS_KEY = 'dsa-quest-settings'

function readSettings(): Settings {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '') as Partial<Settings>
    return {
      master: typeof parsed.master === 'number' ? parsed.master : 80,
      music: typeof parsed.music === 'number' ? parsed.music : 70,
      effects: typeof parsed.effects === 'number' ? parsed.effects : 85,
    }
  } catch {
    return { master: 80, music: 70, effects: 85 }
  }
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`pixel-panel ${className}`}>{children}</div>
}


export function HomeScreen({ onStartGame, onContinueGame, onOpenMultiplayer }: HomeScreenProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<Settings>(() => readSettings())
  const [soundOn, setSoundOn] = useState(false)
  const launchingRef = useRef(false)
  const hasSave = useMemo(() => QuestManager.hasSave(), [])

  useEffect(() => {
    // Download images/map/audio and warm the CPU-heavy tile extrusion cache in idle
    // time. Game startup can then reuse the prepared canvases instead of processing
    // every tile sheet on the first visible game frame.
    void preloadGameAssets()
      .then(() => warmVillageTileExtrusionCache())
      .catch((error: unknown) => {
        // The game's normal Phaser loader remains the fallback if prewarming fails.
        console.warn('[DSA Quest] Background asset prewarm skipped; loading normally.', error)
      })
    // Keep music silent until the player explicitly clicks the Sound button.
    return undefined
  }, [])

  const updateSetting = (key: keyof Settings, value: number) => {
    const next = { ...settings, [key]: value }
    setSettings(next)
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
    setMusicVolume()
  }

  const handleSoundToggle = () => {
    if (soundOn) {
      muteHomeMusic()
      setSoundOn(false)
    } else {
      unmuteHomeMusic()
      startHomeMusic()
      setSoundOn(true)
    }
  }

  const startNewAdventure = () => {
    if (launchingRef.current) return
    launchingRef.current = true
    // Stop the intro immediately; App switches screens in the same event.
    // GameWorld starts the adventure track after Phaser mounts.
    stopAllMusic()
    onStartGame()
  }

  const continueAdventure = () => {
    if (launchingRef.current) return
    launchingRef.current = true
    stopAllMusic()
    onContinueGame()
  }

  if (settingsOpen) {
    return (
      <main className="home-screen village-home settings-home">
        <div className="home-artwork-frame">
          <SettingsScreen
            settings={settings}
            onSettingChange={updateSetting}
            onCloseSettings={() => setSettingsOpen(false)}
          />
        </div>
      </main>
    )
  }

  return (
    <main className="home-screen village-home">
      {/* Simple button-only home screen. */}
      <div className="home-artwork-frame">

        <Panel className="menu-card stone-menu-wrapper stone-slab-click-overlay stone-menu-interactive-overlay">
        <div className="menu-label">CHOOSE YOUR PATH</div>
        <button
          type="button"
          className="menu-button primary play-button button-play"
          onPointerDown={(event) => {
            event.preventDefault()
            startNewAdventure()
          }}
          onClick={startNewAdventure}
        >
          <span>PLAY</span><b>►</b>
        </button>
        <button
          type="button"
          className={`menu-button secondary button-continue ${hasSave ? '' : 'disabled'}`}
          onPointerDown={(event) => {
            event.preventDefault()
            continueAdventure()
          }}
          onClick={continueAdventure}
          disabled={!hasSave}
        >
          <span>CONTINUE</span><small>{hasSave ? 'RESUME YOUR QUEST' : 'NO SAVE DATA'}</small>
        </button>
        <button type="button" className="menu-button secondary multiplayer-menu-button" onClick={onOpenMultiplayer}>
          <span>PLAY ONLINE</span><small>INVITE FRIENDS · LIVE CHAT</small>
        </button>
        <button type="button" className="menu-button settings-button button-settings" onClick={() => setSettingsOpen(true)}>
          <span>SETTINGS</span><b>⚙</b>
        </button>
        <div className="controls-hint"><kbd>WASD</kbd> MOVE <i>•</i> <kbd>E</kbd> INTERACT</div>
        </Panel>
      </div>

      <button type="button" className={`sound-toggle ${soundOn ? 'is-on' : 'is-off'}`} onClick={() => handleSoundToggle()} aria-label={soundOn ? 'Mute home music' : 'Unmute home music'}>
        <span aria-hidden="true">{soundOn ? '♪' : '×'}</span> {soundOn ? 'SOUND ON' : 'SOUND OFF'}
      </button>



      <footer>© DSA QUEST  •  A PIXEL ADVENTURE IN ALGORITHMS</footer>
    </main>
  )
}
