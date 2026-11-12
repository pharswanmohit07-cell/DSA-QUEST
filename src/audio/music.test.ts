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

    music.startKnowledgeT¶»§q«^