import './settingsModal.css'

type SettingsModalProps = {
  volume: number
  playerSpeed: number
  saveMessage: string
  onVolumeChange: (volume: number) => void
  onPlayerSpeedChange: (speed: number) => void
  onSave: () => void
  onResume: () => void
  onMainMenu: () => void
}

export function SettingsModal({
  volume,
  playerSpeed,
  saveMessage,
  onVolumeChange,
  onPlayerSpeedChange,
  onSave,
  onResume,
  onMainMenu,
}: SettingsModalProps) {
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

        {saveMessage && <p className="settings-modal-status" role="status">{saveMessage}</p>}

        <div className="settings-modal-actions">
          <button type="button" className="settings-modal-button primary" onClick={onSave}>SAVE GAME</button>
          <button type="button" className="settings-modal-button" onClick={onResume}>RESUME</button>
          <button type="button" className="settings-modal-button danger" onClick={onMainMenu}>MAIN MENU</button>
        </div>
      </section>
    </div>
  )
}
