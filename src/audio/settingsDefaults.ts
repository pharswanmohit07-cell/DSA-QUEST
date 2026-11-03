export type AudioSettings = {
  master: number
  music: number
  effects: number
}

export const SETTINGS_KEY = 'dsa-quest-settings'
export const DEFAULT_MASTER_VOLUME = 50
export const DEFAULT_MUSIC_VOLUME = 70
export const DEFAULT_EFFECTS_VOLUME = 85

export const DEFAULT_AUDIO_SETTINGS: Readonly<AudioSettings> = {
  master: DEFAULT_MASTER_VOLUME,
  music: DEFAULT_MUSIC_VOLUME,
  effects: DEFAULT_EFFECTS_VOLUME,
}

export function readAudioSettings(): AudioSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '') as Partial<AudioSettings>
    return {
      master: typeof parsed.master === 'number' ? parsed.master : DEFAULT_AUDIO_SETTINGS.master,
      music: typeof parsed.music === 'number' ? parsed.music : DEFAULT_AUDIO_SETTINGS.music,
      effects: typeof parsed.effects === 'number' ? parsed.effects : DEFAULT_AUDIO_SETTINGS.effects,
    }
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS }
  }
}

export function getMasterVolume(): number {
  try {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '') as { master?: number }
    return Math.max(
      0,
      Math.min(1, (typeof settings.master === 'number' ? settings.master : DEFAULT_MASTER_VOLUME) / 100),
    )
  } catch {
    return DEFAULT_MASTER_VOLUME / 100
  }
}
