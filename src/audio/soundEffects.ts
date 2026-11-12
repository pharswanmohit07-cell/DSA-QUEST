import { DEFAULT_EFFECTS_VOLUME, DEFAULT_MASTER_VOLUME, SETTINGS_KEY } from './settingsDefaults'
import { acquireMusicDuck } from './musicDucking'

let audioContext: AudioContext | null = null
let lastFootstepAt = 0
let lastVoiceCueAt = 0
let cueIndex = 0

const FOOTSTEP_COOLDOWN_MS = 310
const VOICE_CUE_COOLDOWN_MS = 90

function readEffectsVolume(): number {
  try {
    const value = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as {
      master?: unknown
      effects?: unknown
    }
    const master = typeof value.master === 'number' && Number.isFinite(value.master)
      ? Math.max(0, Math.min(100, value.master))
      : DEFAULT_MASTER_VOLUME
    const effects = typeof value.effects === 'number' && Number.isFinite(value.effects)
      ? Math.max(0, Math.min(100, value.effects))
      : DEFAULT_EFFECTS_VOLUME
    return (master / 100) * (effects / 100)
  } catch {
    return (DEFAULT_MASTER_VOLUME / 100) * (DEFAULT_EFFECTS_VOLUME / 100)
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined' || !window.AudioContext || readEffectsVolume() <= 0) return null
  try {
    audioContext ??= new window.AudioContext()
    if (audioContext.state === 'suspended') void audioContext.resume().catch(() => undefined)
    return audioContext
  } catch {
    return null
  }
}

function tone(frequency: number, duration: number, volume: number, type: OscillatorType = 'sine') {
  const context = getAudioContext()
  if (!context) return
  const ef¶»§q«^