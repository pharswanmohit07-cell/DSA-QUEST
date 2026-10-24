let audioContext: AudioContext | null = null
let lastFootstepAt = 0
let lastVoiceCueAt = 0
let cueIndex = 0

const SETTINGS_KEY = 'dsa-quest-settings'
const DEFAULT_MASTER = 80
const DEFAULT_EFFECTS = 85
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
      : DEFAULT_MASTER
    const effects = typeof value.effects === 'number' && Number.isFinite(value.effects)
      ? Math.max(0, Math.min(100, value.effects))
      : DEFAULT_EFFECTS
    return (master / 100) * (effects / 100)
  } catch {
    return (DEFAULT_MASTER / 100) * (DEFAULT_EFFECTS / 100)
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
  const effectiveVolume = volume * readEffectsVolume()
  if (effectiveVolume <= 0) return

  try {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, context.currentTime)
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(effectiveVolume, context.currentTime + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + duration + 0.02)
    oscillator.onended = () => {
      oscillator.disconnect()
      gain.disconnect()
    }
  } catch {
    // Audio is an enhancement; unsupported or interrupted audio must not break gameplay.
  }
}

/** Quiet footstep cue with cooldown to avoid noisy continuous movement. */
export function playFootstep(now: number) {
  if (!Number.isFinite(now) || now - lastFootstepAt < FOOTSTEP_COOLDOWN_MS) return
  lastFootstepAt = now
  tone(cueIndex % 2 === 0 ? 105 : 125, 0.055, 0.018, 'triangle')
  cueIndex += 1
}

/** Short dialogue cue, throttled to prevent rapid repeated UI actions from spamming audio. */
export function playVoiceCue() {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
  if (now - lastVoiceCueAt < VOICE_CUE_COOLDOWN_MS) return
  lastVoiceCueAt = now
  tone(cueIndex % 2 === 0 ? 520 : 460, 0.045, 0.012, 'sine')
  cueIndex += 1
}
