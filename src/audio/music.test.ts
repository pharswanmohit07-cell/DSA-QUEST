import { beforeEach, describe, expect, it, vi } from 'vitest'

class FakeAudio {
  static instances: FakeAudio[] = []
  paused = true
  loop = false
  preload = ''
  volume = 1
  currentTime = 0
  playCount = 0
  pauseCount = 0
  readonly src: string

  constructor(src: string) {
    this.src = src
    FakeAudio.instances.push(this)
  }

  load() {}

  play(): Promise<void> {
    this.paused = false
    this.playCount += 1
    return Promise.resolve()
  }

  pause() {
    this.paused = true
    this.pauseCount += 1
  }
}

type MusicApi = typeof import('./music')

async function loadMusic(settings: Record<string, number> = {}) {
  vi.resetModules()
  FakeAudio.instances = []
  vi.stubGlobal('Audio', FakeAudio as unknown as typeof Audio)
  const { SETTINGS_KEY } = await import('./settingsDefaults')
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  return await import('./music') as MusicApi
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Knowledge Trial background music', () => {
  it('switches Adventure to the trial cue and restores Adventure without overlapping tracks', async () => {
    const music = await loadMusic()
    const [home, adventure, trial] = FakeAudio.instances

    expect(FakeAudio.instances).toHaveLength(3)
    expect(trial?.src).toContain('/audio/38-Intro.ogg')

    music.startHomeMusic()
    expect(home?.paused).toBe(false)
    expect(adventure?.paused).toBe(true)
    expect(trial?.paused).toBe(true)

    music.startAdventureMusic()
    expect(home?.paused).toBe(true)
    expect(adventure?.paused).toBe(false)
    expect(trial?.paused).toBe(true)

    music.startKnowledgeTrialMusic()
    expect(adventure?.paused).toBe(true)
    expect(trial?.paused).toBe(false)
    expect(home?.paused).toBe(true)

    music.startAdventureMusic()
    expect(trial?.paused).toBe(true)
    expect(adventure?.paused).toBe(false)
    expect(home?.paused).toBe(true)
  })

  it('keeps the active music muted and stops all three tracks', async () => {
    const music = await loadMusic()
    const [, adventure, trial] = FakeAudio.instances

    music.startAdventureMusic()
    music.muteHomeMusic()
    music.startKnowledgeTrialMusic()
    expect(adventure?.paused).toBe(true)
    expect(trial?.paused).toBe(true)

    music.unmuteHomeMusic()
    music.stopAllMusic()
    expect(FakeAudio.instances.every((audio) => audio.paused)).toBe(true)
    expect(FakeAudio.instances.every((audio) => audio.currentTime === 0)).toBe(true)
  })

  it('applies the configured music volume to every track', async () => {
    const music = await loadMusic({ master: 100, music: 35 })
    const [home, adventure, trial] = FakeAudio.instances

    music.setMusicVolume()

    expect(home?.volume).toBeCloseTo(0.35)
    expect(adventure?.volume).toBeCloseTo(0.35)
    expect(trial?.volume).toBeCloseTo(0.35)
  })

  it('does not start a second copy of the trial track when the lifecycle effect repeats', async () => {
    const music = await loadMusic()
    const [, adventure, trial] = FakeAudio.instances

    music.startAdventureMusic()
    music.startKnowledgeTrialMusic()
    const playCount = trial?.playCount
    music.startKnowledgeTrialMusic()

    expect(trial?.playCount).toBe(playCount)
    expect(adventure?.paused).toBe(true)
    expect(trial?.paused).toBe(false)
  })
})
