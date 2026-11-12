import { beforeEach, describe, expect, it, vi } from 'vitest'

class FakeAudio {
  static instances: FakeAudio[] = []
  paused = true
  preload = ''
  volume = 1
  currentTime = 0
  pauseCount = 0
  readonly src: string
  private listeners = new Map<string, Array<() => void>>()

  constructor(src: string) {
    this.src = src
    FakeAudio.instances.push(this)
  }

  load() {}

  play(): Promise<void> {
    this.paused = false
    return Promise.resolve()
  }

  pause() {
    this.paused = true
    this.pauseCount += 1
  }

  addEventListener(type: string, listener: () => void) {
    const listeners = this.listeners.get(type) ?? []
    listeners.push(listener)
    this.listeners.set(type, listeners)
  }

  finish() {
    this.paused = true
    for (const listener of this.listeners.get('ended') ?? []) listener()
  }
}

async function loadEffects(settings: Record<string, number> = {}) {
  vi.resetModules()
  FakeAudio.instances = []
  vi.stubGlobal('Audio', FakeAudio as unknown as typeof Audio)
  const { SETTINGS_KEY } = await import('./settingsDefaults')
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  const music = await import('./music')
  const musicTracks = [...FakeAudio.instances]
  FakeAudio.instances = []
  const sounds = await import('./soundEffects')
  return Object.assign(sounds, { music, musicTracks })
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('game sound effects', () => {
  it('randomly plays one of the supplied achievement jingles at the Effects volume', async () => {
    const sounds = await loadEffects({ master: 40, effects: 50 })
    vi.spyOn(Math, 'random').mockReturnValue(0)

    sounds.playAchievementJingle()

    expect(FakeAudio.instances).toHaveLength(1)
    expect(FakeAudio.instances[0]?.src).toBe('/audio/jingles/LevelUp1.wav')
    expect(FakeAudio.instances[0]?.volume).toBeCloseTo(0.2)
    expect(FakeAudio.instances[0]?.paused).toBe(false)
  })

  it('randomly plays one of the four GameOver clips', async () => {
    const sounds = await loadEffects()
    vi.spyOn(Math, 'random').mockReturnValue(0.75)

    sounds.playGameOverJingle()

    expect(FakeAudio.instances).toHaveLength(1)
    expect(FakeAudio.instances[0]?.src).toBe('/audio/jingles/GameOver4.wav')
  })

  it('silences the active background track for a jingle and restores its volume when it ends', async () => {
    const sounds = await loadEffects({ master: 100, music: 70, effects: 80 })
    const adventure = sounds.musicTracks[1] as unknown as FakeAudio
    sounds.music.startAdventureMusic()
    expect(adventure.volume).toBeCloseTo(0.5)

    sounds.playAchievementJingle()
    expect(adventure.volume).toBe(0)
    expect(FakeAudio.instances[0]?.paused).toBe(false)

    FakeAudio.instances[0]?.finish()
    expect(adventure.volume).toBeCloseTo(0.5)
  })

  it('keeps music silent when a playing jingle is replaced, then restores after the replacement ends', async () => {
    const sounds = await loadEffects()
    const adventure = sounds.musicTracks[1] as unknown as FakeAudio
    const volumeTransitions: number[] = []
    let currentVolume = adventure.volume
    Object.defineProperty(adventure, 'volume', {
      configurable: true,
      get: () => currentVolume,
      set: (value: number) => {
        currentVolume = value
        volumeTransitions.push(value)
      },
    })
    sounds.music.startAdventureMusic()

    sounds.playAchievementJingle()
    volumeTransitions.length = 0
    sounds.playGameOverJingle()
    expect(FakeAudio.instances[0]?.pauseCount).toBe(1)
    expect(adventure.volume).toBe(0)
    expect(volumeTransitions).not.toContain(0.35)

    FakeAudio.instances[1]?.finish()
    expect(adventure.volume).toBeCloseTo(0.35)
  })

  it('restores background music when a one-shot effect is cancelled', async () => {
    const sounds = await loadEffects()
    const adventure = sounds.musicTracks[1] as unknown as FakeAudio
    sounds.music.startAdventureMusic()

    sounds.playAchievementJingle()
    expect(adventure.volume).toBe(0)

    sounds.stopSoundEffects()
    expect(FakeAudio.instances[0]?.paused).toBe(true)
    expect(adventure.volume).toBeCloseTo(0.35)
  })

  it('does not play effects when the master or Effects volume is zero', async () => {
    const sounds = await loadEffects({ master: 100, effects: 0 })
    sounds.playAchievementJingle()
    expect(FakeAudio.instances).toHaveLength(0)
  })

  it('stops the previous short effect before playing the next one', async () => {
    const sounds = await loadEffects()
    vi.spyOn(Math, 'random').mockReturnValue(0)

    sounds.playAchievementJingle()
    sounds.playGameOverJingle()

    expect(FakeAudio.instances).toHaveLength(2)
    expect(FakeAudio.instances[0]?.pauseCount).toBe(1)
    expect(FakeAudio.instances[1]?.paused).toBe(false)
  })
})
