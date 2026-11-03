import { useEffect, useState } from 'react'
import emberIdleUrl from '../assets/characters/ember-idle.svg'
import mossIdleUrl from '../assets/characters/moss-idle.svg'
import azureIdleUrl from '../assets/characters/azure-idle.svg'
import { getCharacterId, setCharacterId, type CharacterId } from './player/characterAppearance'
import './settingsModal.css'
import { TEST_MODE_BUTTON_ENABLED } from './testMode'
import { useOptionalAccountActions } from './multiplayer/AccountActionsContext'

const CHARACTER_SKINS: Array<{ id: CharacterId; name: string; detail: string; imageUrl: string }> = [
  { id: 'ember', name: 'EMBER', detail: 'CORAL / TEAL', imageUrl: emberIdleUrl },
  { id: 'moss', name: 'MOSS', detail: 'FOREST / CREAM', imageUrl: mossIdleUrl },
  { id: 'azure', name: 'AZURE', detail: 'BLUE / SILVER', imageUrl: azureIdleUrl },
]

type SettingsModalProps = {
  volume: number
  playerSpeed: number
  isAdmin: boolean
  isAuthenticated: boolean
  onRequestLogin?: () => void
  layerPreviewEnabled: boolean
  testGateOpen: boolean
  saveMessage: string
  onVolumeChange: (volume: number) => void
  onPlayerSpeedChange: (speed: number) => void
  onLayerPreviewChange: (enabled: boolean) => void
  onTestGateChange: (open: boolean) => void
  onSave: () => void
  onResume: () => void
  onMainMenu: () => void
}

export function SettingsModal({
  volume,
  playerSpeed,
  isAdmin,
  isAuthenticated,
  onRequestLogin,
  layerPreviewEnabled,
  testGateOpen,
  saveMessage,
  onVolumeChange,
  onPlayerSpeedChange,
  onLayerPreviewChange,
  onTestGateChange,
  onSave,
  onResume,
  onMainMenu,
}: SettingsModalProps) {
  const accountActions = useOptionalAccountActions()
  const [savedCharacterId, setSavedCharacterId] = useState<CharacterId>(() => getCharacterId('Hero'))
  const [previewCharacterId, setPreviewCharacterId] = useState<CharacterId>(() => getCharacterId('Hero'))
  const [skinMessage, setSkinMessage] = useState<string | null>(null)

  useEffect(() => {
    const syncCharacter = (event: Event) => {
      const next = (event as CustomEvent<CharacterId>).detail
      if (next === 'ember' || next === 'moss' || next === 'azure') {
        setSavedCharacterId(next)
        setPreviewCharacterId(next)
        setSkinMessage(null)
      }
    }
    window.addEventListener('dsaq:character-changed', syncCharacter)
    return () => window.removeEventListener('dsaq:character-changed', syncCharacter)
  }, [])

  const previewSkinIndex = CHARACTER_SKINS.findIndex((skin) => skin.id === previewCharacterId)
  const previewSkin = CHARACTER_SKINS[previewSkinIndex] ?? CHARACTER_SKINS[0]
  const canChangeCharacter = isAuthenticated
  const isPreviewSkinSaved = previewCharacterId === savedCharacterId

  const browseCharacter = (direction: -1 | 1) => {
    const nextIndex = (previewSkinIndex + direction + CHARACTER_SKINS.length) % CHARACTER_SKINS.length
    setPreviewCharacterId(CHARACTER_SKINS[nextIndex].id)
    setSkinMessage(null)
  }

  const applyPreviewCharacter = () => {
    if (!canChangeCharacter) {
      onRequestLogin?.()
      return
    }
    if (isPreviewSkinSaved) return
    setCharacterId(previewCharacterId)
    window.dispatchEvent(new CustomEvent<CharacterId>('dsaq:character-changed', { detail: previewCharacterId }))
    setSavedCharacterId(previewCharacterId)
    setSkinMessage(`${previewSkin.name} saved.`)
  }

  return (
    <div className="settings-modal-backdrop" role="presentation">
      <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="pause-menu-title">
        <div className="settings-modal-eyebrow">PAUSED</div>
        <h2 id="pause-menu-title">SETTINGS</h2>

        <label className="settings-modal-volume">
          <span>MASTER VOLUME</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(event) => onVolumeChange(Number(event.target.value))}
          />
          <strong>{Math.round(volume * 100)}%</strong>
        </label>

        <label className="settings-modal-volume">
          <span>PLAYER SPEED</span>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={playerSpeed}
            onChange={(event) => onPlayerSpeedChange(Number(event.target.value))}
          />
          <strong>{playerSpeed}%</strong>
        </label>

        <section className="settings-modal-skin-selector" aria-labelledby="settings-skin-heading">
          <div className="settings-modal-skin-heading">
            <h3 id="settings-skin-heading">PLAYER SKIN</h3>
            <span>{previewSkinIndex + 1} / {CHARACTER_SKINS.length}</span>
          </div>
          <div className="settings-modal-skin-carousel" aria-label="Choose character skin">
            <button
              type="button"
              className="settings-modal-skin-arrow"
              aria-label="Previous character skin"
              onClick={() => browseCharacter(-1)}
            >
              ◀
            </button>
            <div className="settings-modal-skin-preview" aria-live="polite">
              <span
                className={`settings-modal-skin-sprite settings-modal-skin-${previewSkin.id}`}
                style={{ backgroundImage: `url("${previewSkin.imageUrl}")` }}
                aria-hidden="true"
              />
              <strong>{previewSkin.name}</strong>
              <span>{previewSkin.detail}</span>
              <small>{isPreviewSkinSaved ? 'CURRENT SKIN' : 'PREVIEW ONLY'}</small>
            </div>
            <button
              type="button"
              className="settings-modal-skin-arrow"
              aria-label="Next character skin"
              onClick={() => browseCharacter(1)}
            >
              ▶
            </button>
          </div>
          <button
            type="button"
            className="settings-modal-skin-action"
            onClick={applyPreviewCharacter}
            disabled={canChangeCharacter && isPreviewSkinSaved}
          >
            {canChangeCharacter ? isPreviewSkinSaved ? 'CURRENTLY EQUIPPED' : 'USE THIS CHARACTER' : 'SIGN IN TO CHANGE'}
          </button>
          {skinMessage && <p className="settings-modal-skin-message" role="status">{skinMessage}</p>}
          <p className="settings-modal-skin-help">Browse all skins freely. Sign in to equip a different character.</p>
        </section>

        {isAdmin && (
          <button
            type="button"
            className={`settings-modal-button layer-preview-toggle${layerPreviewEnabled ? ' is-on' : ''}`}
            onClick={() => onLayerPreviewChange(!layerPreviewEnabled)}
          >
            LAYER PREVIEW: {layerPreviewEnabled ? 'ON' : 'OFF'}
          </button>
        )}

        {/* TEMP: testing aid for village development; disabled before release by removing the flag. */}
        {isAdmin && TEST_MODE_BUTTON_ENABLED && (
          <button
            type="button"
            className={`settings-modal-button test-mode-toggle${testGateOpen ? ' is-on' : ''}`}
            onClick={() => onTestGateChange(!testGateOpen)}
          >
            TEST MODE - GATE: {testGateOpen ? 'OPEN' : 'CLOSED'}
          </button>
        )}

        {accountActions && (
          <div className="settings-modal-account">
            <div className="settings-modal-account-copy">
              <span>SIGNED IN AS</span>
              <strong title={accountActions.displayName}>{accountActions.displayName}</strong>
            </div>
            <button
              type="button"
              className="settings-modal-button settings-modal-logout"
              onClick={() => void accountActions.logout()}
              disabled={accountActions.isLoggingOut}
            >
              {accountActions.isLoggingOut ? 'SIGNING OUT…' : 'LOG OUT'}
            </button>
          </div>
        )}

        {saveMessage && <p className="settings-modal-status" role="status">{saveMessage}</p>}

        <div className="settings-modal-actions">
          <button type="button" className="settings-modal-button primary" onClick={onSave}>SAVE GAME</button>
          <button type="button" className="settings-modal-button" onClick={onResume}>RESUME</button>
          <button type="button" className="settings-modal-button danger" onClick={onMainMenu}>SAVE &amp; EXIT</button>
        </div>
      </section>
    </div>
  )
}
