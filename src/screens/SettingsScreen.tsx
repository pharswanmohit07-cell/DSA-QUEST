import './SettingsScreen.css'
import { useState } from 'react'
import { getCharacterId, setCharacterId, type CharacterId } from '../game/player/characterAppearance'
import { useOptionalAccountActions } from '../game/multiplayer/AccountActionsContext'

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

        <fieldset className="settings-character-row">
          <legend>PLAYER SKIN</legend>
          <div className="settings-character-options" role="group" aria-label="Choose player skin">
            {([
              { id: 'ember', name: 'EMBER', detail: 'CORAL / TEAL' },
              { id: 'moss', name: 'MOSS', detail: 'FOREST / CREAM' },
              { id: 'azure', name: 'AZURE', detail: 'BLUE / SILVER' },
            ] as const).map((skin) => (
              <button key={skin.id} type="button"
                className={`settings-skin-button settings-skin-${skin.id}${characterId === skin.id ? ' is-selected' : ''}`}
                aria-pressed={characterId === skin.id}
                onClick={() => { setSelectedCharacter(skin.id); setCharacterId(skin.id) }}>
                <span className={`settings-skin-preview settings-skin-preview-${skin.id}`} aria-hidden="true" />
                <strong>{skin.name}</strong><small>{skin.detail}</small>
                {characterId === skin.id && <span className="settings-skin-check">✓ SELECTED</span>}
              </button>
            ))}
          </div>
          <small className="settings-character-help">Choose your hero skin. Your selection is saved for your next adventure.</small>
        </fieldset>

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
