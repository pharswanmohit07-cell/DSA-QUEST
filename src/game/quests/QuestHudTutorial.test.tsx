import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QuestHudTutorial, QUEST_HUD_TUTORIAL_KEY } from './QuestHudTutorial'

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

function mountTargets() {
  const quest = document.createElement('button')
  quest.className = 'quest-tracker-toggle'
  const settings = document.createElement('button')
  settings.className = 'game-settings-button'
  document.body.append(quest, settings)
  vi.spyOn(quest, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(12, 12, 38, 38),
  )
  vi.spyOn(settings, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(window.innerWidth - 50, 12, 38, 38),
  )
  return { quest, settings }
}

function click(container: HTMLElement, testId: string) {
  const button = container.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)
  if (!button) throw new Error(`Missing tutorial control: ${testId}`)
  act(() => button.click())
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  if (root) act(() => root?.unmount())
  host?.remove()
  document.querySelectorAll('.quest-tracker-toggle, .game-settings-button').forEach((node) => node.remove())
  host = undefined
  root = undefined
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('Quest and Settings HUD tutorial', () => {
  it('highlights Quest first, then Settings, and persists Got it', () => {
    mountTargets()
    const container = render(<QuestHudTutorial />)

    expect(container.querySelector('[data-testid="hud-tutorial-spotlight"]')?.getAttribute('data-target'))
      .toBe('quest')
    expect(container.textContent).toContain('current objective')
    click(container, 'hud-tutorial-next')

    expect(container.querySelector('[data-testid="hud-tutorial-spotlight"]')?.getAttribute('data-target'))
      .toBe('settings')
    expect(container.textContent).toContain('music')
    click(container, 'hud-tutorial-done')

    expect(container.querySelector('[data-testid="hud-tutorial"]')).toBeNull()
    expect(localStorage.getItem(QUEST_HUD_TUTORIAL_KEY)).toBe('true')
  })

  it('allows Skip from the first step and persists dismissal', () => {
    mountTargets()
    const container = render(<QuestHudTutorial />)
    click(container, 'hud-tutorial-skip')

    expect(container.querySelector('[data-testid="hud-tutorial"]')).toBeNull()
    expect(localStorage.getItem(QUEST_HUD_TUTORIAL_KEY)).toBe('true')
  })

  it('dismisses with Escape and does not show again when the key is set', () => {
    mountTargets()
    const container = render(<QuestHudTutorial />)
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    expect(container.querySelector('[data-testid="hud-tutorial"]')).toBeNull()

    act(() => root?.render(<QuestHudTutorial />))
    expect(container.querySelector('[data-testid="hud-tutorial"]')).toBeNull()
  })

  it('does not show a detached tutorial when either HUD target is missing', () => {
    const quest = document.createElement('button')
    quest.className = 'quest-tracker-toggle'
    document.body.append(quest)
    const container = render(<QuestHudTutorial />)

    expect(container.querySelector('[data-testid="hud-tutorial"]')).toBeNull()
  })

  it('measures actual target positions and keeps the callout within the viewport', () => {
    mountTargets()
    const container = render(<QuestHudTutorial />)
    const spotlight = container.querySelector<HTMLElement>('[data-testid="hud-tutorial-spotlight"]')
    const callout = container.querySelector<HTMLElement>('[data-testid="hud-tutorial-callout"]')

    expect(spotlight?.style.left).toBe('12px')
    expect(spotlight?.style.top).toBe('12px')
    expect(callout?.style.left).toBe('12px')
    expect(Number.parseFloat(callout?.style.left ?? '0')).toBeGreaterThanOrEqual(0)
  })
})
