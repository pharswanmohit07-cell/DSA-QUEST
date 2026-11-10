import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SettingsModal } from '../game/SettingsModal'
import { CHARACTER_SELECTION_KEY } from '../game/player/characterAppearance'
import { SettingsScreen } from './SettingsScreen'
import { StatsPanel } from './StatsPanel'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let host: HTMLDivElement | undefined
let root: Root | undefined

function mount(node: ReactNode): HTMLDivElement {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => root?.render(node))
  return host
}

function clickButton(container: HTMLElement, label: string): void {
  const button = Array.from(container.querySelectorAll('button'))
    .find((candidate) => candidate.textContent?.trim() === label)
  if (!button) throw new Error(`Button not found: ${label}`)
  act(() => button.click())
}

function mountProfile(options: {
  isAuthenticated?: boolean
  guestMode?: boolean
  onRequestLogin?: () => void
} = {}): HTMLDivElement {
  return mount(
    <StatsPanel
      isAuthenticated={options.isAuthenticated ?? false}
      guestMode={options.guestMode ?? false}
      onRequestLogin={options.onRequestLogin}
      onClose={vi.fn()}
    />,
  )
}

afterEach(() => {
  if (root) act(() => root?.unmount())
  host?.remove()
  root = undefined
  host = undefined
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('player skin UI ownership', () => {
  it('keeps the Home Settings audio controls without Player Skin cards', () => {
    const container = mount(
      <SettingsScreen
        settings={{ master: 80, music: 60, effects: 50 }}
        onSettingChange={vi.fn()}
        onCloseSettings={vi.fn()}
      />,
    )

    expect(container.textContent).not.toContain('Player Skin')
    expect(container.querySelector('.stats-character-card')).toBeNull()
    expect(container.querySelector('[data-testid="character-skin-select"]')).toBeNull()
    expect(container.querySelectorAll('input[type="range"]')).toHaveLength(3)
    expect(container.textContent).toContain('MASTER VOLUME')
    expect(container.textContent).toContain('MUSIC')
    expect(container.textContent).toContain('SOUND EFFECTS')
  })

  it('starts on the equipped skin and browses the full skin order without persisting previews', () => {
    localStorage.setItem(CHARACTER_SELECTION_KEY, 'Hunter')
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const container = mountProfile()

    expect(container.querySelector('.stats-character-skin-copy strong')?.textContent).toBe('HUNTER')
    expect(container.querySelector('.stats-character-skin-copy small')?.textContent).toBe('CURRENTLY EQUIPPED')
    expect(container.querySelector('.stats-level-badge')?.textContent).toContain('PLAYER LEVEL')

    const next = container.querySelector<HTMLButtonElement>('[aria-label="Next player skin"]')
    const previous = container.querySelector<HTMLButtonElement>('[aria-label="Previous player skin"]')
    expect(next).not.toBeNull()
    expect(previous).not.toBeNull()
    expect(container.querySelector('.stats-character-select-label')?.textContent?.trim()).toBe('SELECT CHARACTER')
    const picker = container.querySelector<HTMLSelectElement>('[data-testid="character-skin-select"]')
    expect(picker?.options.length).toBe(6)

    act(() => next?.click())
    expect(container.querySelector('.stats-character-skin-copy strong')?.textContent).toBe('KNIGHT')
    expect(container.querySelector('.stats-character-skin-copy small')?.textContent).toBe('PREVIEW ONLY')

    act(() => next?.click())
    expect(container.querySelector('.stats-character-skin-copy strong')?.textContent).toBe('OLD MAN3')
    act(() => previous?.click())
    expect(container.querySelector('.stats-character-skin-copy strong')?.textContent).toBe('KNIGHT')
    act(() => previous?.click())
    expect(container.querySelector('.stats-character-skin-copy strong')?.textContent).toBe('HUNTER')

    expect(localStorage.getItem(CHARACTER_SELECTION_KEY)).toBe('Hunter')
    expect(setItem).not.toHaveBeenCalled()
    expect(container.querySelectorAll('[aria-label$="character preview"]')).toHaveLength(1)
  })

  it('lets a player jump directly to any available pack skin from Profile', () => {
    localStorage.setItem(CHARACTER_SELECTION_KEY, 'Hunter')
    const container = mountProfile()
    const picker = container.querySelector<HTMLSelectElement>('[data-testid="character-skin-select"]')

    expect(picker?.options.length).toBe(6)
    act(() => {
      if (!picker) return
      picker.value = 'Villager4'
      picker.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(container.querySelector('.stats-character-skin-copy strong')?.textContent).toBe('VILLAGER4')
    expect(localStorage.getItem(CHARACTER_SELECTION_KEY)).toBe('Hunter')
  })

  it('resets the preview to the equipped skin when Profile is reopened', () => {
    localStorage.setItem(CHARACTER_SELECTION_KEY, 'Hunter')
    const firstProfile = mountProfile()
    const next = firstProfile.querySelector<HTMLButtonElement>('[aria-label="Next player skin"]')
    act(() => next?.click())
    expect(firstProfile.querySelector('.stats-character-skin-copy strong')?.textContent).toBe('KNIGHT')

    act(() => root?.unmount())
    firstProfile.remove()
    root = undefined
    const reopenedProfile = mountProfile()

    expect(reopenedProfile.querySelector('.stats-character-skin-copy strong')?.textContent).toBe('HUNTER')
    expect(localStorage.getItem(CHARACTER_SELECTION_KEY)).toBe('Hunter')
  })

  it('keeps guest skin preview separate from the login-gated equip and name actions', () => {
    localStorage.setItem(CHARACTER_SELECTION_KEY, 'Hunter')
    const onRequestLogin = vi.fn()
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const container = mountProfile({ isAuthenticated: true, guestMode: true, onRequestLogin })
    const next = container.querySelector<HTMLButtonElement>('[aria-label="Next player skin"]')

    act(() => next?.click())
    expect(container.querySelector('.stats-character-skin-copy strong')?.textContent).toBe('KNIGHT')
    expect(onRequestLogin).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()

    clickButton(container, 'SIGN IN TO EQUIP')
    expect(onRequestLogin).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem(CHARACTER_SELECTION_KEY)).toBe('Hunter')
    expect(setItem).not.toHaveBeenCalled()

    clickButton(container, 'SIGN IN TO CHANGE')
    expect(onRequestLogin).toHaveBeenCalledTimes(2)
  })

  it('retains the explicit authenticated equip action in Profile', () => {
    localStorage.setItem(CHARACTER_SELECTION_KEY, 'Hunter')
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const characterChanged = vi.fn()
    window.addEventListener('dsaq:character-changed', characterChanged)
    const container = mountProfile({ isAuthenticated: true })

    const next = container.querySelector<HTMLButtonElement>('[aria-label="Next player skin"]')
    act(() => next?.click())
    clickButton(container, 'USE THIS CHARACTER')

    expect(localStorage.getItem(CHARACTER_SELECTION_KEY)).toBe('Knight')
    expect(setItem).toHaveBeenCalledWith(CHARACTER_SELECTION_KEY, 'Knight')
    expect(characterChanged).toHaveBeenCalledTimes(1)
    expect(container.querySelector('.stats-character-skin-copy small')?.textContent).toBe('CURRENTLY EQUIPPED')
    window.removeEventListener('dsaq:character-changed', characterChanged)
  })

  it('removes Player Skin from Pause Settings but keeps volume, speed, and Save Game', () => {
    const onSave = vi.fn()
    const container = mount(
      <SettingsModal
        volume={0.6}
        playerSpeed={80}
        isAdmin={false}
        isAuthenticated={false}
        layerPreviewEnabled={false}
        testGateOpen={false}
        saveMessage=""
        onVolumeChange={vi.fn()}
        onPlayerSpeedChange={vi.fn()}
        onLayerPreviewChange={vi.fn()}
        onTestGateChange={vi.fn()}
        onSave={onSave}
        onResume={vi.fn()}
        onMainMenu={vi.fn()}
      />,
    )

    expect(container.textContent).not.toContain('Player Skin')
    expect(container.querySelectorAll('input[type="range"]')).toHaveLength(2)
    expect(container.textContent).toContain('MASTER VOLUME')
    expect(container.textContent).toContain('PLAYER SPEED')
    clickButton(container, 'SAVE GAME')
    expect(onSave).toHaveBeenCalledOnce()
  })
})
