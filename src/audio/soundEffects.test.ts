import { beforeEach, describe, expect, it, vi } from 'vitest'

class FakeAudio {
  static instances: FakeAudio[] = []
  static nextPlayPromise: Promise<void> | null = null
  paused = true
  preload = ''
  volume = 1
  currentTime = 0
  pauseCount = 0
  loadCount = 0
  readonly src: string
  private listeners = new Map<string, Array<() => void>>()

  constructor(src: string) {
    this.src = src
    FakeAudio.instances.push(this)
  }

  load() { this.loadCount += 1 }

  play(): Promise<void> {
    this.paused = false
    return FakeAudio.nextPlayPromise ?? Promise.resolve()
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
  FakeAudio.nextPlayPromise = null
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


  it('keeps the dedicated cutscene cue separate from achievement jingles', async () => {
    const sounds = await loadEffects()
    vi.spyOn(Math, 'random').mockReturnValue(0)

    sounds.playAchievementJingle()
    const rewardJingle = FakeAudio.instances[0]
    sounds.playCutsceneJingle()

    expect(FakeAudio.instances).toHaveLength(2)
    expect(rewardJingle?.src).toBe('/audio/jingles/LevelUp1.wav')
    expect(rewardJingle?.pauseCount).toBe(0)
    expect(FakeAudio.instances[1]?.src).toBe('/audio/jingles/LevelUp2.wav')
    expect(FakeAudio.instances[1]?.paused).toBe(false)
  })

  it('preloads the cutscene cue once and reuses the buffered audio element', async () => {
    const sounds = await loadEffects()

    sounds.preloadCutsceneJingle()
    expect(FakeAudio.instances).toHaveLength(1)
    expect(FakeAudio.instances[0]?.src).toBe('/audio/jingles/LevelUp2.wav')
    expect(FakeAudio.instances[0]?.loadCount).toBe(1)

    sounds.playCutsceneJingle()

    expect(FakeAudio.instances).toHaveLength(1)
    expect(FakeAudio.instances[0]?.paused).toBe(false)
  })

  it('starts cutscene choreography only after the cue playback begins', async () => {
    const sounds = await loadEffects()
    const onPlaybackStart = vi.fn()

    sounds.playCutsceneJingle(onPlaybackStart)
    expect(onPlaybackStart).not.toHaveBeenCalled()

    await Promise.resolve()
    expect(onPlaybackStart).toHaveBeenCalledTimes(1)
  })

  it('cancels audio that reports playback only after the visual fallback', async () => {
    let resolvePlayback: (() => void) | undefined
    let fallback: (() => void) | undefined
    const sounds = await loadEffects()
    FakeAudio.nextPlayPromise = new Promise<void>((resolve) => {
      resolvePlayback = resolve
    })
    vi.spyOn(window, 'setTimeout').mockImplementation(((handler: TimerHandler) => {
      if (typeof handler === 'function') fallback = handler as () => void
      return 1
    }) as typeof window.setTimeout)

    const onPlaybackStart = vi.fn()
    sounds.playCutsceneJingle(onPlaybackStart)
    const audio = FakeAudio.instances[0]

    expect(audio?.paused).toBe(false)
    expect(onPlaybackStart).not.toHaveBeenCalled()

    fallback?.()
    expect(onPlaybackStart).toHaveBeenCalledTimes(1)
    expect(audio?.paused).toBe(true)

    resolvePlayback?.()
    await Promise.resolve()
    expect(audio?.paused).toBe(true)
    expect(audio?.currentTime).toBe(0)
    expect(onPlaybackStart).toHaveBeenCalledTimes(1)
  })

  it('still starts cutscene choreography when effects are muted', async () => {
    const sounds = await loadEffects({ master: 100, effects: 0 })
    const onPlaybackStart = vi.fn()

    sounds.playCutsceneJingle(onPlaybackStart)

    expect(FakeAudio.instances).toHaveLength(0)
    expect(onPlaybackStart).toHaveBeenCalledTimes(1)
  })

  it('plays the Ninja Adventure success cue for an empty-scroll pickup', async () => {
    const sounds = await loadEffects()

    sounds.playScrollPickupCue()

    expect(FakeAudio.instances).toHaveLength(1)
    expect(FakeAudio.instances[0]?.src).toBe('/audio/jingles/Success1.wav')
    expect(FakeAudio.instances[0]?.paused).toBe(false)
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
