import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import './homeScreen.css'
import panelFrameUrl from '../assets/UI/nine_path_panel.png'
import hunterIdleUrl from '../assets/tiles/ninja-village/Hunter/SeparateAnim/Idle.png'
import elderIdleUrl from '../assets/tiles/ninja-village/Elder/Idle.png'
import fieldTilesUrl from '../assets/tiles/ninja-village/TilesetField.png'
import natureTilesUrl from '../assets/tiles/ninja-village/TilesetNature.png'
import { QuestManager } from '../game/quests/QuestManager'

export type HomeScreenProps = {
  onPlay: () => void
  onContinue: () => void
}

type Settings = {
  master: number
  music: number
  effects: number
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
  return (
    <div
      className={`pixel-panel ${className}`}
      style={{ backgroundImage: `url(${panelFrameUrl})` }}
    >
      {children}
    </div>
  )
}

export function HomeScreen({ onPlay, onContinue }: HomeScreenProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<Settings>(() => readSettings())
  const hasSave = useMemo(() => QuestManager.hasSave(), [])

  const updateSetting = (key: keyof Settings, value: number) => {
    const next = { ...settings, [key]: value }
    setSettings(next)
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
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
          <button className="menu-button secondary" onClick={() => setSettingsOpen(false)}>
            <span>BACK TO MENU</span><b>↩</b>
          </button>
        </Panel>
      </main>
    )
  }

  return (
    <main className="home-screen">
      <div className="sky-glow" />
      <div className="pixel-scenery scenery-left" style={{ backgroundImage: `url(${fieldTilesUrl})` }} />
      <div className="pixel-scenery scenery-right" style={{ backgroundImage: `url(${natureTilesUrl})` }} />
      <div className="cloud cloud-one" /><div className="cloud cloud-two" />
      <div className="mountain-range" />
      <div className="ground-band" />
      <img className="menu-character hero-character" src={hunterIdleUrl} alt="Hunter hero" />
      <img className="menu-character elder-character" src={elderIdleUrl} alt="Elder guide" />

      <section className="title-lockup">
        <div className="title-kicker">THE VILLAGE OF KNOWLEDGE</div>
        <h1><span>DSA</span> QUEST</h1>
        <p>LEARN. BUILD. PLAY. MASTER DSA.</p>
      </section>

      <Panel className="menu-card">
        <div className="menu-label">CHOOSE YOUR PATH</div>
        <button className="menu-button primary" onClick={onPlay}>
          <span>PLAY</span><b>▶</b>
        </button>
        <button className={`menu-button ${hasSave ? 'secondary' : 'disabled'}`} onClick={onContinue} disabled={!hasSave}>
          <span>CONTINUE</span><small>{hasSave ? 'RESUME YOUR QUEST' : 'NO SAVE DATA'}</small>
        </button>
        <button className="menu-button secondary" onClick={() => setSettingsOpen(true)}>
          <span>SETTINGS</span><b>⚙</b>
        </button>
        <div className="controls-hint"><kbd>WASD</kbd> MOVE <i>•</i> <kbd>E</kbd> INTERACT</div>
      </Panel>
      <footer>© DSA QUEST  •  A PIXEL ADVENTURE IN ALGORITHMS</footer>
    </main>
  )
}
