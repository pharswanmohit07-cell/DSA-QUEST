import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import './homeScreen.css'
import { SettingsScreen } from './SettingsScreen'
import { StatsPanel } from './StatsPanel'
import { AdminPanel } from '../game/multiplayer/AdminPanel'
import type { Settings } from './SettingsScreen'
import homeReferenceUrl from '../../Home Screen.png'
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
  isAdmin?: boolean
  guestMode?: boolean
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


export function HomeScreen({ isAdmin = false, guestMode = false, onStartGame, onContinueGame, onOpenMultiplayer }: HomeScreenProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
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
          <div className="village-art" style={{ backgroundImage: `url("${homeReferenceUrl}")` }} aria-hidden="true" />
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
      {/* Container wrapper: establishes the query container the menu card is sized
          against, so the card tracks the artwork rather than the window. */}
      <div className="home-artwork-frame">
        <div className="village-art" style={{ backgroundImage: `url("${homeReferenceUrl}")` }} aria-hidden="true" />

        <Panel className="menu-card stone-menu-wrapper stone-slab-click-overlay stone-menu-interactive-overlay">
        <div className="menu-label">CHOOSE YOUR PATH</div>
        {hasSave ? (
          <>
            <button
              type="button"
              className="menu-button primary button-continue"
              onPointerDown={(event) => {
                event.preventDefault()
                continueAdventure()
              }}
              onClick={continueAdventure}
            >
              <span>CONTINUE</span><small>RESUME YOUR QUEST</small>
            </button>
            {!guestMode && <button type="button" className="menu-button secondary multiplayer-menu-button" onClick={onOpenMultiplayer}>
              <span>PLAY ONLINE</span><small>INVITE FRIENDS · LIVE CHAT</small>
            </button>}
            <button
              type="button"
              className="menu-button secondary play-button button-play"
              onPointerDown={(event) => {
                event.preventDefault()
                startNewAdventure()
              }}
              onClick={startNewAdventure}
            >
              <span>NEW GAME</span><b>►</b>
            </button>
          </>
        ) : (
          <>
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
            {!guestMode && <button type="button" className="menu-button secondary multiplayer-menu-button" onClick={onOpenMultiplayer}>
              <span>PLAY ONLINE</span><small>INVITE FRIENDS · LIVE CHAT</small>
            </button>}
          </>
        )}
        {isAdmin && <button type="button" className="menu-button secondary" onClick={() => setAdminOpen(true)}><span>ADMIN TOOLS</span><b>⚑</b></button>}
        <button type="button" className="menu-button secondary" onClick={() => setProfileOpen(true)}>
          <span>PROFILE</span><b>★</b>
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



      {profileOpen && <StatsPanel isAdmin={isAdmin} onClose={() => setProfileOpen(false)} />}
      {adminOpen && isAdmin && <AdminPanel onClose={() => setAdminOpen(false)} />}

      <footer>© DSA QUEST  •  A PIXEL ADVENTURE IN ALGORITHMS</footer>
    </main>
  )
}
