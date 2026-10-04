import adventureMusicUrl from '../assets/audio/dsa-quest-adventure.ogg'

const HOME_VOLUME_CAP = 0.5
const GAME_VOLUME_CAP = 0.5
const DEFAULT_MASTER = 80
const DEFAULT_MUSIC = 70
const homeMusic = new Audio('/audio/38-Intro.ogg')
const adventureMusic = new Audio(adventureMusicUrl)

homeMusic.loop = true
adventureMusic.loop = true
homeMusic.preload = 'auto'
adventureMusic.preload = 'auto'
homeMusic.load()
adventureMusic.load()

let fadeTimer: number | null = null
let adventureStartTimer: number | null = null
let musicEnabled = true

function readVolume(): number {
  try {
    const settings = JSON.parse(localStorage.getItem('dsa-quest-settings') ?? '') as {
      master?: number
      music?: number
    }
    const master = typeof settings.master === 'number' ? settings.master : DEFAULT_MASTER
    const music = typeof settings.music === 'number' ? settings.music : DEFAULT_MUSIC
    return Math.max(0, Math.min(1, (master / 100) * (music / 100)))
  } catch {
    return (DEFAULT_MASTER / 100) * (DEFAULT_MUSIC / 100)
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

function beginAdventureMusic() {
  if (!musicEnabled) {
    return
  }
  adventureMusic.loop = true
  adventureMusic.volume = gameVolume()
  if (adventureMusic.paused) {
    adventureMusic.currentTime = 0
    tryPlay(adventureMusic)
  }
}

export function startHomeMusic() {
  if (!musicEnabled) {
    return
  }
  stopFade()
  stopAdventureStart()
  adventureMusic.pause()
  adventureMusic.currentTime = 0
  homeMusic.loop = true
  homeMusic.volume = homeVolume()
  tryPlay(homeMusic)
}

export function muteHomeMusic() {
  musicEnabled = false
  stopFade()
  stopAdventureStart()
  homeMusic.pause()
  adventureMusic.pause()
}

export function unmuteHomeMusic() {
  musicEnabled = true
  startHomeMusic()
}

export function setMusicVolume() {
  homeMusic.volume = homeVolume()
  adventureMusic.volume = gameVolume()
}

export function getMasterVolume() {
  try {
    const settings = JSON.parse(localStorage.getItem('dsa-quest-settings') ?? '') as { master?: number }
    return Math.max(0, Math.min(1, (typeof settings.master === 'number' ? settings.master : DEFAULT_MASTER) / 100))
  } catch {
    return DEFAULT_MASTER / 100
  }
}

export function setMasterVolume(volume: number) {
  const master = Math.round(Math.max(0, Math.min(1, volume)) * 100)
  try {
    const settings = JSON.parse(localStorage.getItem('dsa-quest-settings') ?? '{}') as Record<string, unknown>
    localStorage.setItem('dsa-quest-settings', JSON.stringify({ ...settings, master }))
  } catch {
    // Audio still updates in memory when storage is unavailable.
  }
  setMusicVolume()
}

export function stopAllMusic() {
  stopFade()
  stopAdventureStart()
  homeMusic.pause()
  adventureMusic.pause()
  homeMusic.currentTime = 0
  adventureMusic.currentTime = 0
}

export function startAdventureMusic() {
  if (!musicEnabled || adventureStartTimer !== null) {
    return
  }
  beginAdventureMusic()
}

export function transitionToAdventure(onComplete: () => void) {
  if (!musicEnabled) {
    onComplete()
    return
  }

  stopFade()
  stopAdventureStart()

  // Intro is stopped before Adventure is allowed to play: no overlapping tracks.
  homeMusic.pause()
  homeMusic.currentTime = 0
  homeMusic.volume = 0
  adventureMusic.pause()
  adventureMusic.currentTime = 0
  adventureMusic.loop = true
  adventureMusic.volume = 0

  adventureStartTimer = window.setTimeout(() => {
    adventureStartTimer = null
    if (!musicEnabled) {
      return
    }
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
