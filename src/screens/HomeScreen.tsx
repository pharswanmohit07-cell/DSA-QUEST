import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import './homeScreen.css'
import hunterWalkUrl from '../assets/tiles/ninja-village/Hunter/SeparateAnim/Walk.png'
import { QuestManager } from '../game/quests/QuestManager'
import { preloadGameAssets } from '../game/preloadGameAssets'
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
}

type Settings = {
  master: number
  music: number
  effects: number
}

type Facing = 'right' | 'left' | 'front'

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

/** Seconds the walker spends travelling, matching the CSS `left` transition. */
const WALK_SECONDS = 4.2
/** Seconds the walker stands still facing the viewer before turning around. */
const PAUSE_SECONDS = 1.2

function WalkingHero() {
  // The loop is walk-right -> face front -> walk-left -> face front. `facing` is the
  // direction the sprite shows and `moving` is false during the front-facing pause,
  // which is what swaps the sprite to its single idle frame.
  const [patrol, setPatrol] = useState<{ x: number; facing: Facing; moving: boolean }>({
    x: 15,
    facing: 'right',
    moving: true,
  })

  useEffect(() => {
    // `patrolRef` mirrors the walker's position and direction outside React state,
    // so the recursive timer chain always knows where it is without the effect
    // having to re-run (which would restart the CSS transition on every step).
    const patrolRef = { x: 15, dir: 'right' as Facing }
    const timers: number[] = []

    /**
     * One leg: set the destination and let the CSS `left` transition carry the
     * sprite across, then pause facing the viewer before turning around.
     *
     * The destination is assigned immediately so the travel happens via CSS, and
     * only the arrival is scheduled here.
     */
    const walkLeg = () => {
      const goingRight = patrolRef.dir === 'right'
      patrolRef.x = goingRight ? 76 : 15
      setPatrol({ x: patrolRef.x, facing: patrolRef.dir, moving: true })

      timers.push(
        window.setTimeout(() => {
          // Arrived: stop and turn to face the viewer.
          setPatrol({ x: patrolRef.x, facing: 'front', moving: false })
          timers.push(
            window.setTimeout(() => {
              patrolRef.dir = goingRight ? 'left' : 'right'
              walkLeg()
            }, PAUSE_SECONDS * 1000),
          )
        }, WALK_SECONDS * 1000),
      )
    }

    walkLeg()

    return () => {
      for (const t of timers) window.clearTimeout(t)
    }
  }, [])

  return (
    <div className="hero-patrol" style={{ left: `${patrol.x}%` }} aria-label="A hero walking through the village">
      <div
        className={`hero-sprite facing-${patrol.facing}${patrol.moving ? '' : ' is-idle'}`}
        style={{ backgroundImage: `url(${hunterWalkUrl})` }}
        aria-hidden="true"
      />
      <span className="hero-shadow" aria-hidden="true" />
    </div>
  )
}

export function HomeScreen({ onStartGame, onContinueGame }: HomeScreenProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<Settings>(() => readSettings())
  const [soundOn, setSoundOn] = useState(true)
  const launchingRef = useRef(false)
  const hasSave = useMemo(() => QuestManager.hasSave(), [])

  useEffect(() => {
    void preloadGameAssets()
    startHomeMusic()
    const retryHomeMusic = () => startHomeMusic()
    window.addEventListener('pointerdown', retryHomeMusic)
    window.addEventListener('click', retryHomeMusic)
    window.addEventListener('touchstart', retryHomeMusic, { passive: true })
    window.addEventListener('keydown', retryHomeMusic)
    return () => {
      window.removeEventListener('pointerdown', retryHomeMusic)
      window.removeEventListener('click', retryHomeMusic)
      window.removeEventListener('touchstart', retryHomeMusic)
      window.removeEventListener('keydown', retryHomeMusic)
    }
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
      <main className="home-screen settings-screen">
        <Panel className="settings-card">
          <div className="eyebrow">OPTIONS</div>
          <h1>SETTINGS</h1>
          <p className="settings-note">Tune your adventure audio. Sound hooks are ready for future tracks.</p>
          {(['master', 'music', 'effects'] as const).map((key) => (
            <label className="volume-row" key={key}>
              <span>{key === 'master' ? 'MASTER VOLUME' : key === 'music' ? 'MUSIC' : 'SOUND EFFECTS'}</span>
              <input
                type="range"
                min="0"
                max="100"
                value={settings[key]}
                onChange={(event) => updateSetting(key, Number(event.target.value))}
              />
              <strong>{settings[key]}%</strong>
            </label>
          ))}
        <button type="button" className="menu-button secondary" onClick={() => setSettingsOpen(false)}>
            <span>BACK TO MENU</span><b>↩</b>
          </button>
        </Panel>
      </main>
    )
  }

  return (
    <main className="home-screen village-home">
      {/* Container wrapper: establishes the query container the menu card is sized
          against, so the card tracks the artwork rather than the window. */}
      <div className="home-artwork-frame">
        <div className="village-art" aria-hidden="true" />
        <WalkingHero />

        <section className="title-lockup">
          <div className="title-kicker">THE VILLAGE OF KNOWLEDGE</div>
          <h1><span>DSA</span> QUEST</h1>
          <p>LEARN. BUILD. PLAY. MASTER DSA.</p>
        </section>

        <Panel className="menu-card stone-menu-wrapper">
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
