import { useState } from 'react'
import './SettingsScreen.css'
import { useOptionalAccountActions } from '../game/multiplayer/AccountActionsContext'
import { getCharacterId, setCharacterId, type CharacterId } from '../game/player/characterAppearance'

export type Settings = {
  master: number
  music: number
  effects: number
}

type SettingsScreenProps = {
  settings: Settings
  onSettingChange: (key: keyof Settings, value: number) => void
  onCloseSettings: () => void
}

export function SettingsScreen({ settings, onSettingChange, onCloseSettings }: SettingsScreenProps) {
  const accountActions = useOptionalAccountActions()
  const [characterId, setSelectedCharacter] = useState<CharacterId>(() => getCharacterId('Hero'))
  return (
    <div className="settings-overlay" role="presentation">
      <section className="settings-modal-card" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="settings-modal-eyebrow">OPTIONS</div>
        <h1 id="settings-title">SETTINGS</h1>
        <p className="settings-note">Tune your adventure audio and choose your hero.</p>

        {(['master', 'music', 'effects'] as const).map((key) => (
          <label className="settings-volume-row" key={key}>
            <div className="settings-volume-heading">
              <span>{key === 'master' ? 'MASTER VOLUME' : key === 'music' ? 'MUSIC' : 'SOUND EFFECTS'}</span>
              <strong>{settings[key]}%</strong>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings[key]}
              onChange={(event) => onSettingChange(key, Number(event.target.value))}
            />
          </label>
        ))}

        <label className="settings-character-row">
          <span>PLAYER CHARACTER</span>
          <select
            value={characterId}
            onChange={(event) => {
              const nextCharacter = event.target.value as CharacterId
              setSelectedCharacter(nextCharacter)
              setCharacterId(nextCharacter)
            }}
          >
            <option value="ember">EMBER — Coral &amp; Teal</option>
            <option value="moss">MOSS — Forest &amp; Cream</option>
            <option value="azure">AZURE — Blue &amp; Silver</option>
          </select>
          <small>Your choice is saved and used when you enter the game.</small>
        </label>

        {accountActions && (
          <div className="settings-account-row">
            <div className="settings-account-copy">
              <span>SIGNED IN AS</span>
              <strong title={accountActions.displayName}>{accountActions.displayName}</strong>
            </div>
            <button
              type="button"
              className="settings-logout-btn"
              onClick={() => void accountActions.logout()}
              disabled={accountActions.isLoggingOut}
            >
              {accountActions.isLoggingOut ? 'SIGNING OUT…' : 'LOG OUT'}
            </button>
          </div>
        )}

        <button type="button" onClick={onCloseSettings} className="pixel-back-btn">
          ◄ BACK TO MENU
        </button>
      </section>
    </div>
  )
}
