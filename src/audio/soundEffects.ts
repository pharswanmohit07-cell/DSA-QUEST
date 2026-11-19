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

const ACHIEVEMENT_JINGLES = [
  '/audio/jingles/LevelUp1.wav',
  '/audio/jingles/LevelUp3.wav',
  '/audio/jingles/Success1.wav',
  '/audio/jingles/Success2.wav',
  '/audio/jingles/Success3.wav',
  '/audio/jingles/Success4.wav',
] as const

const GAME_OVER_JINGLES = [
  '/audio/jingles/GameOver.wav',
  '/audio/jingles/GameOver2.wav',
  '/audio/jingles/GameOver3.wav',
  '/audio/jingles/GameOver4.wav',
] as const

let activeEffect: HTMLAudioElement | null = null
let releaseActiveEffectDuck: (() => void) | null = null
let preloadedCutsceneAudio: HTMLAudioElement | null = null
let activeCutsceneEffect: HTMLAudioElement | null = null
let releaseActiveCutsceneDuck: (() => void) | null = null

/**
 * Fetch the short story cue while the village scene loads, not when the gate
 * is already open. Reusing this element avoids a cold download/decode mid-reveal.
 */
export function preloadCutsceneJingle(): void {
  if (typeof Audio === 'undefined' || preloadedCutsceneAudio) return

  try {
    const audio = new Audio('/audio/jingles/LevelUp2.wav')
    audio.preload = 'auto'
    audio.volume = 0
    preloadedCutsceneAudio = audio
    audio.addEventListener('error', () => {
      if (preloadedCutsceneAudio === audio) preloadedCutsceneAudio = null
    }, { once: true })
    audio.load()
  } catch {
    preloadedCutsceneAudio = null
  }
}

function stopActiveEffect() {
  activeEffect?.pause()
  releaseActiveEffectDuck?.()
  activeEffect = null
  releaseActiveEffectDuck = null
}

function playRandomEffect(sources: readonly string[]) {
  if (typeof Audio === 'undefined') return

  const volume = readEffectsVolume()
  if (volume <= 0) return

  const index = Math.min(sources.length - 1, Math.floor(Math.random() * sources.length))
  const audio = new Audio(sources[index]!)
  audio.preload = 'auto'
  audio.volume = volume

  // Acquire the replacement mute lease before releasing the previous one,
  // so background music never flashes back between consecutive jingles.
  const releaseMusicDuck = acquireMusicDuck()
  stopActiveEffect()
  activeEffect = audio
  releaseActiveEffectDuck = releaseMusicDuck
  let released = false
  const release = () => {
    if (released) return
    released = true
    if (activeEffect === audio) {
      activeEffect = null
      releaseActiveEffectDuck = null
    }
    releaseMusicDuck()
  }
  audio.addEventListener('ended', release, { once: true })
  audio.addEventListener('error', release, { once: true })

  try {
    const playback = audio.play()
    if (playback && typeof playback.catch === 'function') {
      void playback.catch(release)
    }
  } catch {
    // A failed short effect must never interrupt gameplay or leave music muted.
    release()
  }
}

/** Plays one random Level Up or Success clip for a completed milestone. */
export function playAchievementJingle() {
  playRandomEffect(ACHIEVEMENT_JINGLES)
}

/** Plays one random Game Over clip after the player exhausts all hearts. */
export function playGameOverJingle() {
  playRandomEffect(GAME_OVER_JINGLES)
}

/**
 * Dedicated story/cutscene channel. LevelUp2 is never selected as a random
 * reward jingle and cannot be replaced by an ordinary achievement cue.
 */
export function playCutsceneJingle(onPlaybackStart?: () => void) {
  const startVisuals = () => {
    if (onPlaybackStart) onPlaybackStart()
  }

  if (typeof Audio === 'undefined') {
    startVisuals()
    return
  }

  const volume = readEffectsVolume()
  if (volume <= 0) {
    startVisuals()
    return
  }

  preloadCutsceneJingle()
  const audio = preloadedCutsceneAudio ?? new Audio('/audio/jingles/LevelUp2.wav')
  activeCutsceneEffect?.pause()
  releaseActiveCutsceneDuck?.()
  try {
    audio.pause()
    audio.currentTime = 0
  } catch {
    // A stale media element should not block the reveal.
  }
  audio.volume = volume

  const releaseMusicDuck = acquireMusicDuck()
  activeCutsceneEffect = audio
  releaseActiveCutsceneDuck = releaseMusicDuck

  let released = false
  let visualsStarted = false
  let fallbackStarted = false
  let startTimeout: number | null = null
  const clearStartTimeout = () => {
    if (startTimeout !== null && typeof window !== 'undefined') {
      window.clearTimeout(startTimeout)
      startTimeout = null
    }
  }
  const beginVisuals = () => {
    if (visualsStarted) return
    visualsStarted = true
    clearStartTimeout()
    startVisuals()
  }
  const release = () => {
    if (released) return
    released = true
    clearStartTimeout()
    if (activeCutsceneEffect === audio) {
      activeCutsceneEffect = null
      releaseActiveCutsceneDuck = null
    }
    releaseMusicDuck()
  }

  audio.addEventListener('playing', () => {
    if (fallbackStarted) {
      audio.pause()
      audio.currentTime = 0
      return
    }
    beginVisuals()
  }, { once: true })
  audio.addEventListener('ended', release, { once: true })
  audio.addEventListener('error', () => {
    if (preloadedCutsceneAudio === audio) preloadedCutsceneAudio = null
    release()
    beginVisuals()
  }, { once: true })

  // A preloaded cue should start almost instantly. If a browser/device still
  // has not begun playback after this short window, cancel late audio and
  // continue the reveal silently instead of letting voice arrive out of sync.
  if (typeof window !== 'undefined') {
    startTimeout = window.setTimeout(() => {
      if (visualsStarted) return
      fallbackStarted = true
      try {
        audio.pause()
        audio.currentTime = 0
      } catch {
        // Continue the visual fallback even if media cancellation fails.
      }
      release()
      beginVisuals()
    }, 450)
  }

  try {
    const playback = audio.play()
    if (playback && typeof playback.then === 'function') {
      void playback.then(() => {
        if (fallbackStarted) {
          // A network-delayed play() can resolve after the visual fallback.
          // Pause it again so the cue never arrives late over live gameplay.
          audio.pause()
          audio.currentTime = 0
          return
        }
        beginVisuals()
      }).catch(() => {
        release()
        beginVisuals()
      })
    }
  } catch {
    release()
    beginVisuals()
  }
}

/** Short synthesized UI confirmation; it does not replace another jingle. */
export function playUiConfirm() {
  tone(740, 0.065, 0.025, 'sine')
}

/** Stops the reward and cutscene channels during scene teardown. */
export function stopSoundEffects() {
  stopActiveEffect()
  activeCutsceneEffect?.pause()
  releaseActiveCutsceneDuck?.()
  activeCutsceneEffect = null
  releaseActiveCutsceneDuck = null
}
