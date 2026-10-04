import adventureMusicUrl from '../assets/audio/dsa-quest-adventure.ogg'

const HOME_VOLUME_CAP = 0.5
const DEFAULT_MASTER = 80
const DEFAULT_MUSIC = 70
const homeMusic = new Audio('/audio/38-Intro.ogg')
const adventureMusic = new Audio(adventureMusicUrl)

homeMusic.loop = true
adventureMusic.loop = true
homeMusic.preload = 'auto'
adventureMusic.preload = 'auto'

let fadeTimer: number | null = null
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

function tryPlay(audio: HTMLAudioElement) {
  void audio.play().catch(() => {
    // The global click listener retries playback after browser autoplay blocks it.
  })
}

function homeVolume() {
  return Math.min(HOME_VOLUME_CAP, readVolume())
}

export function startHomeMusic() {
  if (!musicEnabled) {
    return
  }
  stopFade()
  adventureMusic.pause()
  adventureMusic.currentTime = 0
  homeMusic.loop = true
  homeMusic.volume = homeVolume()
  tryPlay(homeMusic)
}

export function muteHomeMusic() {
  musicEnabled = false
  stopFade()
  homeMusic.pause()
  adventureMusic.pause()
}

export function unmuteHomeMusic() {
  musicEnabled = true
  startHomeMusic()
}

export function setMusicVolume() {
  homeMusic.volume = homeVolume()
  adventureMusic.volume = readVolume()
}

export function transitionToAdventure(onComplete: () => void) {
  if (!musicEnabled) {
    onComplete()
    return
  }

  stopFade()
  const targetVolume = readVolume()
  adventureMusic.currentTime = 0
  adventureMusic.loop = true
  adventureMusic.volume = 0
  tryPlay(adventureMusic)

  const homeStart = homeMusic.paused ? 0 : homeMusic.volume
  const startedAt = performance.now()
  fadeTimer = window.setInterval(() => {
    const progress = Math.min(1, (performance.now() - startedAt) / 850)
    homeMusic.volume = homeStart * (1 - progress)
    adventureMusic.volume = targetVolume * progress
    if (progress >= 1) {
      stopFade()
      homeMusic.pause()
      homeMusic.currentTime = 0
      onComplete()
    }
  }, 16)
}
