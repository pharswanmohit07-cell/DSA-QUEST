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
  document.querySelectorAll('.quest-tracker-toggle, .¶»§q«^