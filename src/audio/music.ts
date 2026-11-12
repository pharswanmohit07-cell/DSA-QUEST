import adventureMusicUrl from '../assets/audio/dsa-quest-adventure.ogg'
import {
  DEFAULT_MASTER_VOLUME,
  DEFAULT_MUSIC_VOLUME,
  SETTINGS_KEY,
} from './settingsDefaults'
export { getMasterVolume } from './settingsDefaults'

const HOME_VOLUME_CAP = 0.5
const GAME_VOLUME_CAP = 0.5
const homeMusic = new Audio('/audio/38-Intro.ogg')
const adventureMusic = new Audio(adventureMusicUrl)
// The checked-in pack has no third track; this reuses the existing intro as a
// distinct Knowledge Trial cue so it can be auditioned in the preview.
const knowledgeTrialMusic = new Audio('/audio/38-Intro.ogg')

for (const audio of [homeMusic, adventureMusic, knowledgeTrialMusic]) {
  audio.loop = true
  audio.preload = 'auto'
  audio.load()
}

let fadeTimer: number | null = null
let adventureStartTimer: number | null = null
let musicEnabled = true
let activeTrack: 'home' | 'adventure' | 'knowledge-trial' | null = null

function readVolume(): number {
  try {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '') as {
      master?: number
      music?: number
    }
    const master = typeof settings.master === 'number' ? settings.master : DEFAULT_MASTER_VOLUME
    const music = typeof settings.music === 'number' ? settings.music : DEFAULT_MUSIC_VOLUME
    return Math.max(0, Math.min(1, (master / 100) * (music / 100)))
  } catch {
    return (DEFAULT_MASTER_VOLUME / 100) * (DEFAULT_MUSIC_VOLUME / 100)
  }
}

function stopFade() {
  if (fadeTimer !== null) {
    window.clearInterval(fadeTimer)
    fadeTimer = null
  }
}

function stopAdventureStart() {
  if (adventureStartTimer !== null) {
    window.clearTimeout(adventureStartTimer)
    adventureStartTimer = null
  }
}

function tryPlay(audio: HTMLAudioElement) {
  void audio.play().catch(() => {
    // The global interaction listener retries playback after browser autoplay blocks it.
  })
}

function homeVolume() {
  return Math.min(HOME_VOLUME_CAP, readVolume())
}

function gameVolume() {
  return Math.min(GAME_VOLUME_CAP, readVolume())
}

function pauseAndReset(audio: HTMLAudioElement) {
  audio.pause()
  audio.currentTime = 0
}

/** Retry browser-blocked autoplay on the first real user gesture. */
function retryActiveMusic() {
  if (!musicEnabled || !activeTrack) return
  const audio = activeTrack === 'home'
    ? homeMusic
    : activeTrack === 'adventure'
      ? adventureMusic
      : knowledgeTrialMusic
  if (audio.paused) {
    audio.loop = true
    audio.volume = activeTrack === 'home' ? homeVolume() : gameVolume()
    tryPlay(audio)
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', retryActiveMusic, { passive: true })
  window.addEventListener('touchstart', retryActiveMusic, { passive: true })
  window.addEventListener('keydown', retryActiveMusic)
}

function beginAdventureMusic() {
  if (!musicEnabled) return
  activeTrack = 'adventure'
  adventureMusic.loop = true
  adventureMusic.volume = gameVolume()
  if (adventureMusic.paused) {
    adventureMusic.currentTime = 0
    tryPlay(adventureMusic)
  }
}

export function startHomeMusic() {
  if (!musicEnabled) return
  activeTrack = 'home'
  stopFade()
  stopAdventureStart()
  pauseAndReset(adventureMusic)
  pauseAndReset(knowledgeTrialMusic)
  homeMusic.loop = true
  homeMusic.volume = homeVolume()
  if (homeMusic.paused) {
    homeMusic.currentTime = 0
    tryPlay(homeMusic)
  }
}

export function muteHomeMusic() {
  musicEnabled = false
  activeTrack = null
  stopFade()
  stopAdventureStart()
  pauseAndReset(homeMusic)
  pauseAndReset(adventureMusic)
  pauseAndReset(knowledgeTrialMusic)
}

export function unmuteHomeMusic() {
  musicEnabled = true
  startHomeMusic()
}

export function setMusicVolume() {
  homeMusic.volume = homeVolume()
  adventureMusic.volume = gameVolume()
  knowledgeTrialMusic.volume = gameVolume()
}

export function setMasterVolume(volume: number) {
  const master = Math.round(Math.max(0, Math.min(1, volume)) * 100)
  try {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as Record<string, unknown>
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, master }))
  } catch {
    // Audio still updates in memory when storage is unavailable.
  }
  setMusicVolume()
}

export function stopAllMusic() {
  activeTrack = null
  stopFade()
  stopAdventureStart()
  pauseAndReset(homeMusic)
  pauseAndReset(adventureMusic)
  pauseAndReset(knowledgeTrialMusic)
}

export function startAdventureMusic() {
  if (!musicEnabled) return
  if (activeTrack === 'adventure' && !adventureMusic.paused) return
  stopFade()
  stopAdventureStart()
  pauseAndReset(homeMusic)
  pauseAndReset(knowledgeTrialMusic)
  beginAdventureMusic()
}

/** Switches to the Knowledge Scroll trial cue only while that challenge is active. */
export function startKnowledgeTrialMusic() {
  if (!musicEnabled) return
  if (activeTrack === 'knowledge-trial' && !knowledgeTrialMusic.paused) return
  stopFade()
  stopAdventureStart()
  pauseAndReset(homeMusic)
  pauseAndReset(adventureMusic)
  activeTrack = 'knowledge-trial'
  knowledgeTrialMusic.loop = true
  knowledgeTrialMusic.volume = gameVolume()
  if (knowledgeTrialMusic.paused) {
    knowledgeTrialMusic.currentTime = 0
    tryPlay(knowledgeTrialMusic)
  }
}

/** Fades from the Home intro into the normal Adventure track without overlap. */
export function transitionToAdventure(onComplete: () => void) {
  if (!musicEnabled) {
    onComplete()
    return
  }

  activeTrack = 'adventure'
  stopFade()
  stopAdventureStart()

  pauseAndReset(homeMusic)
  pauseAndReset(knowledgeTrialMusic)
  adventureMusic.pause()
  adventureMusic.currentTime = 0
  adventureMusic.loop = true
  adventureMusic.volume = 0

  adventureStartTimer = window.setTimeout(() => {
    adventureStartTimer = null
    if (!musicEnabled) return

    const targetVolume = gameVolume()
    tryPlay(adventureMusic)
    const startedAt = performance.now()
    fadeTimer = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / 300)
      adventureMusic.volume = targetVolume * progress
      if (progress >= 1) {
        stopFade()
        onComplete()
      }
    }, 16)
  }, 300)
}
