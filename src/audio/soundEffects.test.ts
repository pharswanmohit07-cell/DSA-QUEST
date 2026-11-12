import { beforeEach, describe, expect, it, vi } from 'vitest'

class FakeAudio {
  static instances: FakeAudio[] = []
  paused = true
  preload = ''
  volume = 1
  currentTime = 0
  pauseCount = 0
  readonly src: string

  constructor(src: string) {
    this.src = src
    FakeAudio.instances.push(this)
  }

  play(): Promise<void> {
    this.paused = false
    return Promise.resolve()
  }

  pause() {
    this.paused = true
    this.pauseCount += 1
  }
}

async function loadEffects(settings: Record<string, number> = {}) {
  vi.resetModules()
  FakeAudio.instances = []
  vi.stubGlobal('Audio', FakeAudio as unknown as typeof Audio)
  const { SETTINGS_KEY } = await import('./settingsDefaults')
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  return await import('./soundEffects')
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

  it('randomly plays one of the four GameOver clips', async () => {¶»§q«^