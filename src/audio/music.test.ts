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
  it('uses the Peaceful theme only while the Scroll trial is active', async () => {
    const music = await loadMusic()
    const [home, adventure, knowledgeTrial] = FakeAudio.instances

    expect(FakeAudio.instances).toHaveLength(3)
    expect(knowledgeTrial?.src).toBe('/audio/jingles/Peaceful.ogg')

    music.startHomeMusic()
    expect(home?.paused).toBe(false)
    expect(adventure?.paused).toBe(true)

    music.startKnowledgeTrialMusic()
    expect(home?.paused).toBe(true)
    expect(adventure?.paused).toBe(true)
    expect(knowledgeTrial?.paused).toBe(false)

    music.startAdventureMusic()
    expect(adventure?.paused).toBe(false)
    expect(knowledgeTrial?.paused).toBe(true)
    expect(home?.paused).toBe(true)
  })

  it('replaces Adventure with Peaceful when the Scroll trial opens from gameplay', async () => {
    const music = await loadMusic()
    const [, adventure, knowledgeTrial] = FakeAudio.instances

    music.startAdventureMusic()
    const playCount = adventure?.playCount
    music.startKnowledgeTrialMusic()

    expect(adventure?.paused).toBe(true)
    expect(adventure?.playCount).toBe(playCount)
    expect(knowledgeTrial?.paused).toBe(false)
    expect(FakeAudio.instances).toHaveLength(3)
  })

  it('keeps music muted and stops all playback', async () => {
    const music = await loadMusic()
    const [, adventure] = FakeAudio.instances

    music.startAdventureMusic()
    music.muteHomeMusic()
    music.startKnowledgeTrialMusic()
    expect(adventure?.paused).toBe(true)

    music.unmuteHomeMusic()
    music.stopAllMusic()
    expect(FakeAudio.instances.every((audio) => audio.paused)).toBe(true)
    expect(FakeAudio.instances.every((audio) => audio.currentTime === 0)).toBe(true)
  })

  it('applies the configured music volume to every music track', async () => {
    const music = await loadMusic({ master: 100, music: 35 })
    const [home, adventure, knowledgeTrial] = FakeAudio.instances

    music.setMusicVolume()

    expect(home?.volume).toBeCloseTo(0.35)
    expect(adventure?.volume).toBeCloseTo(0.35)
    expect(knowledgeTrial?.volume).toBeCloseTo(0.35)
  })

  it('mutes every background track until all one-shot effect ducks are released', async () => {
    const music = await loadMusic({ master: 100, music: 35 })
    const [home, adventure, knowledgeTrial] = FakeAudio.instances

    music.startAdventureMusic()
    const releaseFirst = music.duckMusicForEffect()
    const releaseSecond = music.duckMusicForEffect()

    expect(home?.volume).toBe(0)
    expect(adventure?.volume).toBe(0)
    expect(knowledgeTrial?.volume).toBe(0)

    releaseFirst()
    expect(adventure?.volume).toBe(0)

    releaseSecond()
    expect(adventure?.volume).toBeCloseTo(0.35)
    expect(home?.volume).toBeCloseTo(0.35)
    expect(knowledgeTrial?.volume).toBeCloseTo(0.35)
  })

  it('does not restart the Peaceful track when the Scroll lifecycle effect repeats', async () => {
    const music = await loadMusic()
    const [, adventure, knowledgeTrial] = FakeAudio.instances

    music.startAdventureMusic()
    music.startKnowledgeTrialMusic()
    const playCount = knowledgeTrial?.playCount
    music.startKnowledgeTrialMusic()

    expect(knowledgeTrial?.playCount).toBe(playCount)
    expect(knowledgeTrial?.paused).toBe(false)
    expect(adventure?.paused).toBe(true)
  })
})
