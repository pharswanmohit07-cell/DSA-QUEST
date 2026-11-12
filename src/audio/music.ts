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
const knowledgeTrialMusic = new Audio('/audio/jingles/Peaceful.ogg')
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
    window.clearTimeout(adven¶»§q«^