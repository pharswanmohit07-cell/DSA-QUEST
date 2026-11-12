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
  it('randomly ¶»§q«^