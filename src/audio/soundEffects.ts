const UI_VOLUME = 0.22
let audioContext: AudioContext | null = null
let lastStepAt = 0
let voiceIndex = 0

function context(): AudioContext | null {
  try {
    const Constructor = window.AudioContext
    if (!Constructor) return null
    audioContext ??= new Constructor()
    if (audioContext.state === 'suspended') void audioContext.resume()
    return audioContext
  } catch {
    return null
  }
}

function effectsVolume(): number {
  try {
    const value = JSON.parse(localStorage.getItem('dsa-quest-settings') ?? '{}') as { master?: number; effects?: number }
    return Math.max(0, Math.min(1, ((value.master ?? 80) / 100) * ((value.effects ?? 85) / 100)))
  } catch {
    return 0.68
  }
}

function tone(frequency: number, duration: number, wave: OscillatorType, volume = UI_VOLUME, endFrequency = frequency) {
  const ctx = context()
  if (!ctx) return
  const now = ctx.currentTime
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = wave
  oscillator.frequency.setValueAtTime(frequency, now)
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + duration)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * effectsVolume()), now + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(now)
  oscillator.stop(now + duration + 0.01)
}

export function playClickSound() {
  tone(720, 0.055, 'square', 0.13, 440)
}

export function playConfirmSound() {
  tone(520, 0.07, 'triangle', 0.16, 760)
  window.setTimeout(() => tone(820, 0.09, 'triangle', 0.12, 980), 55)
}

export function playVoiceBlip() {
  const notes = [430, 510, 390, 560, 470]
  const note = notes[voiceIndex++ % notes.length]
  tone(note, 0.065, 'triangle', 0.075, note * 1.08)
}

export function playFootstepSound(now = performance.now()) {
  if (now - lastStepAt < 280) return
  lastStepAt = now
  tone(115 + Math.random() * 24, 0.045, 'triangle', 0.085, 72)
}
