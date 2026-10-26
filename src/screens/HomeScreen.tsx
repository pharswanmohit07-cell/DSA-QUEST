import { useEffect, useRef, useState } from 'react'
import './homeScreen.css'
import { SettingsScreen } from './SettingsScreen'
import { StatsPanel } from './StatsPanel'
import { AdminPanel } from '../game/multiplayer/AdminPanel'
import type { Settings } from './SettingsScreen'
import homeReferenceUrl from '../../Home Screen.png'
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
  displayName?: string
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

export function HomeScreen({
  isAdmin = false,
  displayName = 'Adventurer',
  onStartGame,
  onContinueGame,
  onOpenMultiplayer,
}: HomeScreenProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [settings, setSettings] = useState<Settings>(() => readSettings())
  const [soundOn, setSoundOn] = useState(false)
  const launchingRef = useRef(false)

  useEffect(() => {
    // Prepare assets in the background so game startup can reuse warmed resources.
    void preloadGameAssets()
      .then(() => warmVillageTileExtrusionCache())
      .catch((error: unknown) => {
        console.warn('[DSA Quest] Background asset prewarm skipped; loading normally.', error)
      })
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
      <div className="home-artwork-frame">
        <div className="village-art" style={{ backgroundImage: `url("${homeReferenceUrl}")` }} aria-hidden="true" />
        <div className="hero-patrol" aria-hidden="true" data-adventurer={displayName}>
          <div className="hero-sprite facing-right" style={{ filter: `hue-rotate(${Array.from(displayName).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7) % 360}deg)` }} />
          <div className="hero-shadow" />
        </div>

        <section className="menu-card stone-menu-wrapper stone-slab-click-overlay stone-menu-interactive-overlay" aria-label="Main menu">
          <button
            type="button"
            className="menu-button primary play-button button-play"
            onClick={startNewAdventure}
            onPointerDown={(event) => {
              event.preventDefault()
              startNewAdventure()
            }}
          >
            PLAY<b aria-hidden="true">►</b>
          </button>
          <button
            type="button"
            className="menu-button secondary button-continue"
            onClick={continueAdventure}
            onPointerDown={(event) => {
              event.preventDefault()
              continueAdventure()
            }}
          >
            <span className="menu-button-copy"><span>CONTINUE</span><small>RESUME YOUR QUEST</small></span><b aria-hidden="true">►</b>
          </button>
          <button
            type="button"
            className="menu-button settings-button button-settings"
            onClick={() => setSettingsOpen(true)}
          >
            SETTINGS<b className="settings-gear" aria-hidden="true">⚙</b>
          </button>
        </section>

        {isAdmin && (
          <button type="button" className="home-admin-button" onClick={() => setAdminOpen(true)}>
            ADMIN TOOLS
          </button>
        )}
      </div>

      <button type="button" className="home-stats-button" onClick={() => setProfileOpen(true)} aria-label="Open player profile and stats">
        <span className="home-stats-icon" aria-hidden="true">★</span>
        <span className="home-stats-label">PROFILE</span>
      </button>

      <button type="button" className={`sound-toggle ${soundOn ? 'is-on' : 'is-off'}`} onClick={handleSoundToggle} aria-label={soundOn ? 'Mute home music' : 'Unmute home music'}>
        <span aria-hidden="true">{soundOn ? '♪' : '×'}</span> {soundOn ? 'SOUND ON' : 'SOUND OFF'}
      </button>

      <button
        type="button"
        className="home-play-online-button"
        onClick={onOpenMultiplayer}
      >
        <span className="home-play-online-icon" aria-hidden="true">✦</span>
        <span>PLAY ONLINE</span>
        <span className="home-play-online-arrow" aria-hidden="true">›</span>
      </button>

      {profileOpen && <StatsPanel isAdmin={isAdmin} onClose={() => setProfileOpen(false)} />}
      {adminOpen && isAdmin && <AdminPanel onClose={() => setAdminOpen(false)} />}

      <footer>© DSA QUEST  •  A PIXEL ADVENTURE IN ALGORITHMS</footer>
    </main>
  )
}
