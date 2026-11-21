import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RelicRewardReveal } from './RelicRewardReveal'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let host: HTMLDivElement | undefined
let root: Root | undefined

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(() => {
  if (root) act(() => root?.unmount())
  host?.remove()
  host = undefined
  root = undefined
})

describe('guardian relic reward reveal', () => {
  it('shows the assigned relic artwork and the next guardian location', () => {
    act(() => root?.render(
      <RelicRewardReveal detail={{ guardian: 'arrays', reward: 'fire-scroll' }} onContinue={() => undefined} />,
    ))
    expect(host?.textContent).toContain('FIRE SCROLL OBTAINED')
    expect(host?.querySelector('img')?.getAttribute('src')).toContain('ScrollFire')
    expect(host?.textContent).toContain('Samurai')
    expect(host?.textContent).toContain('eastern dojo')
    expect(host?.textContent).not.toMatch(/empty scrolls remaining/i)
  })

  it('directs the final guardian back to the Old Man', () => {
    act(() => root?.render(
      <RelicRewardReveal detail={{ guardian: 'trees', reward: 'gold-key' }} onContinue={() => undefined} />,
    ))
    expect(host?.textContent).toContain('GOLD KEY OBTAINED')
    expect(host?.textContent).toContain('return to the Old Man')
    expect(host?.textContent).toContain('village gate')
  })

  it('dismisses only after the player confirms', () => {
    const onContinue = vi.fn()
    act(() => root?.render(
      <RelicRewardReveal detail={{ guardian: 'queues', reward: 'ice-scroll' }} onContinue={onContinue} />,
    ))
    act(() => host?.querySelector('button')?.click())
    expect(onContinue).toHaveBeenCalledOnce()
  })
})
