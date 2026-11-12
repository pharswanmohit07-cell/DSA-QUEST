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
  vi.res¶»§q«^