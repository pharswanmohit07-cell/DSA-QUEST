import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { QuestManager } from './QuestManager'
import { RelicJournal } from './RelicJournal'
import {
  acceptRelicCollectionQuest,
  claimEmptyScrolls,
  clearRelicCollection,
  resetRelicCollectionCache,
} from './relicInventory'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let host: HTMLDivElement | undefined
let root: Root | undefined

function renderJournal(): HTMLDivElement {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => root?.render(<RelicJournal onClose={() => undefined} />))
  return host
}

beforeEach(() => {
  localStorage.clear()
  QuestManager.reset()
  clearRelicCollection()
  resetRelicCollectionCache()
})

afterEach(() => {
  if (root) act(() => root?.unmount())
  host?.remove()
  root = undefined
  host = undefined
  localStorage.clear()
  QuestManager.reset()
  clearRelicCollection()
  resetRelicCollectionCache()
})

describe('Relic Journey handover guidance', () => {
  it('directs a player who accepted the quest but has not received the scroll back to the Old Man', () => {
    acceptRelicCollectionQuest()

    const container = renderJournal()
    const objective = container.querySelector('[data-testid="relic-journey-objective"]')

    expect(objective?.getAttribute('data-stage')).toBe('collect-empty-scroll')
    expect(objective?.textContent).toContain('Old Man')
    expect(objective?.textContent).toContain('Receive the empty scroll')
    expect(container.querySelector('[data-testid="relic-journal-supply"]')).toBeNull()
  })

  it('explains that the Old Man gives the scroll before the guardian lesson and the guardian receives it after the player passes', () => {
    acceptRelicCollectionQuest()
    expect(claimEmptyScrolls()).toBe('claimed')

    const container = renderJournal()
    const objective = container.querySelector('[data-testid="relic-journey-objective"]')

    expect(objective?.getAttribute('data-stage')).toBe('master-lesson')
    expect(objective?.textContent).toContain('Old Man has already entrusted you with an empty scroll')
    expect(objective?.textContent).toContain('Complete this guardian’s main lesson')
    expect(objective?.textContent).toContain('After you pass, offer the scroll')
    expect(objective?.textContent).not.toContain('scroll is only offered after you pass')
    expect(container.querySelector('[data-testid="relic-journal-supply"]')?.textContent).toContain('Ready')
  })
})
