import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_AUDIO_SETTINGS,
  getMasterVolume,
  readAudioSettings,
  SETTINGS_KEY,
} from './settingsDefaults'
import {
  DEFAULT_PLAYER_SPEED,
  getStoredPlayerSpeed,
  PLAYER_SPEED_KEY,
  playerPercentToSpeed,
  playerSpeedToPercent,
} from '../game/player/playerSpeedSettings'
import { SettingsModal } from '../game/SettingsModal'
import { SettingsScreen } from '../screens/SettingsScreen'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let host: HTMLDivElement | undefined
let root: Root | undefined

function render(node: ReactNode): HTMLDivElement {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => root?.render(node))
  return host
}

afterEach(() => {
  if (root) act(() => root?.unmount())
  host?.remove()
  root = undefined
  host = undefined
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('new-player settings defaults', () => {
  it('uses 40% player speed when the preference is missing, empty, whitespace, or malformed', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    expect(playerSpeedToPercent(DEFAULT_PLAYER_SPEED)).toBe(40)
    expect(getStoredPlayerSpeed()).toBe(DEFAULT_PLAYER_SPEED)
    expect(setItem).not.toHaveBeenCalled()

    for (const savedValue of ['', '   ', 'not-a-speed', 'NaN']) {
      localStorage.setItem(PLAYER_SPEED_KEY, savedValue)
      setItem.mockClear()
      expect(playerSpeedToPercent(getStoredPlayerSpeed())).toBe(40)
      expect(setItem).not.toHaveBeenCalled()
    }
  })

  it('preserves a saved player speed and an intentionally selected 0% slider value', () => {
    localStorage.setItem(PLAYER_SPEED_KEY, String(playerPercentToSpeed(65)))
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    expect(playerSpeedToPercent(getStoredPlayerSpeed())).toBe(65)
    expect(setItem).not.toHaveBeenCalled()

    localStorage.setItem(PLAYER_SPEED_KEY, String(playerPercentToSpeed(0)))
    setItem.mockClear()
    expect(playerSpeedToPercent(getStoredPlayerSpeed())).toBe(0)
    expect(setItem).not.toHaveBeenCalled()
  })

  it('defaults Home Settings master volume to 50% without changing music and effects defaults', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    expect(readAudioSettings()).toEqual({ master: 50, music: 70, effects: 85 })
    expect(readAudioSettings()).toEqual(DEFAULT_AUDIO_SETTINGS)
    expect(setItem).not.toHaveBeenCalled()

    const container = render(
      <SettingsScreen
        settings={readAudioSettings()}
        onSettingChange={vi.fn()}
        onCloseSettings={vi.fn()}
      />,
    )
    expect(container.textContent).toContain('MASTER VOLUME')
    expect(container.textContent).toContain('50%')
    expect(Array.from(container.querySelectorAll<HTMLInputElement>('input[type="range"]'))
      .map((input) => input.value)).toEqual(['50', '70', '85'])
    expect(setItem).not.toHaveBeenCalled()
  })

  it('defaults Pause Settings to the same 50% master and 40% player speed', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const masterVolume = getMasterVolume()
    const playerSpeed = playerSpeedToPercent(getStoredPlayerSpeed())
    const container = render(
      <SettingsModal
        volume={masterVolume}
        playerSpeed={playerSpeed}
        isAdmin={false}
        isAuthenticated={false}
        layerPreviewEnabled={false}
        testGateOpen={false}
        saveMessage=""
        onVolumeChange={vi.fn()}
        onPlayerSpeedChange={vi.fn()}
        onLayerPreviewChange={vi.fn()}
        onTestGateChange={vi.fn()}
        onSave={vi.fn()}
        onResume={vi.fn()}
        onMainMenu={vi.fn()}
      />,
    )

    const sliders = container.querySelectorAll<HTMLInputElement>('input[type="range"]')
    expect(sliders[0].value).toBe('0.5')
    expect(sliders[1].value).toBe('40')
    expect(container.textContent).toContain('50%')
    expect(container.textContent).toContain('40%')
    expect(setItem).not.toHaveBeenCalled()
  })

  it('preserves saved master, music, and effects values', () => {
    const savedSettings = { master: 80, music: 32, effects: 14 }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(savedSettings))
    const setItem = vi.spyOn(Storage.prototype, 'setItem')

    expect(readAudioSettings()).toEqual(savedSettings)
    expect(getMasterVolume()).toBe(0.8)
    expect(setItem).not.toHaveBeenCalled()
    expect(localStorage.getItem(SETTINGS_KEY)).toBe(JSON.stringify(savedSettings))
  })

  it('falls back to the master default for malformed settings without writing over storage', () => {
    localStorage.setItem(SETTINGS_KEY, '{bad json')
    const setItem = vi.spyOn(Storage.prototype, 'setItem')

    expect(readAudioSettings()).toEqual(DEFAULT_AUDIO_SETTINGS)
    expect(getMasterVolume()).toBe(0.5)
    expect(setItem).not.toHaveBeenCalled()
    expect(localStorage.getItem(SETTINGS_KEY)).toBe('{bad json')
  })

  it('uses the 50% master fallback when JSON is valid but master is invalid', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ master: '80', music: 45, effects: 20 }))
    const setItem = vi.spyOn(Storage.prototype, 'setItem')

    expect(readAudioSettings()).toEqual({ master: 50, music: 45, effects: 20 })
    expect(getMasterVolume()).toBe(0.5)
    expect(setItem).not.toHaveBeenCalled()
  })
})
