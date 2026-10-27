import './settingsModal.css'
import { TEST_MODE_BUTTON_ENABLED } from './testMode'
import { useOptionalAccountActions } from './multiplayer/AccountActionsContext'

type SettingsModalProps = {
  volume: number
  playerSpeed: number
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

        <button
          type="button"
          className={`settings-modal-button layer-preview-toggle${layerPreviewEnabled ? ' is-on' : ''}`}
          onClick={() => onLayerPreviewChange(!layerPreviewEnabled)}
        >
          LAYER PREVIEW: {layerPreviewEnabled ? 'ON' : 'OFF'}
        </button>

        {/* TEMP: testing aid for village development; disabled before release by removing the flag. */}
        {TEST_MODE_BUTTON_ENABLED && (
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
