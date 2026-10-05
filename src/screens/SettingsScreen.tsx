import './SettingsScreen.css'

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
  return (
    <div className="settings-overlay" role="presentation">
      <section className="settings-modal-card" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="settings-modal-eyebrow">OPTIONS</div>
        <h1 id="settings-title">SETTINGS</h1>
        <p className="settings-note">Tune your adventure audio.</p>

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

        <button type="button" onClick={onCloseSettings} className="pixel-back-btn">
          ◄ BACK TO MENU
        </button>
      </section>
    </div>
  )
}
