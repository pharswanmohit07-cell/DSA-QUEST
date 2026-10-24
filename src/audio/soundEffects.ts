let audioContext: AudioContext | null = null
let lastFootstepAt = 0
let cueIndex = 0

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined' || !window.AudioContext) return null
  audioContext ??= new window.AudioContext()
  if (audioContext.state === 'suspended') void audioContext.resume().catch(() => undefined)
  return audioContext
}

function tone(frequency: number, duration: number, volume: number, type: OscillatorType = 'sine') {
  const context = getAudioContext()
  if (!context) return
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, context.currentTime)
  gain.gain.setValueAtTime(0.0001, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(volume, context.currentTime + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start()
  oscillator.stop(context.currentTime + duration + 0.02)
}

/** Quiet, short footstep cue with a cooldown to avoid noisy continuous movement. */
export function playFootstep(now: number) {
  if (now - lastFootstepAt < 310) return
  lastFootstepAt = now
  tone(cueIndex % 2 === 0 ? 105 : 125, 0.055, 0.018, 'triangle')
  cueIndex += 1
}

/** Short, subtle two-note-style voice cue for dialogue advancement. */
export function playVoiceCue() {
  tone(cueIndex % 2 === 0 ? 520 : 460, 0.045, 0.012, 'sine')
  cueIndex += 1
}
