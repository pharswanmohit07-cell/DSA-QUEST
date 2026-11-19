import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EmptyScrollRewardReveal } from './EmptyScrollRewardReveal'

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

describe('empty scroll reward reveal', () => {
  it('shows the actual empty-scroll artwork and the number awarded', () => {
    act(() => {
      root?.render(<EmptyScrollRewardReveal count={7} onContinue={() => undefined} />)
    })

    const image = host?.querySelector('img[alt="Empty scroll"]')
    expect(image).not.toBeNull()
    expect(image?.getAttribute('src')).toContain('ScrollEmpty')
    expect(host?.textContent).toContain('EMPTY SCROLLS RECEIVED')
    expect(host?.textContent).toContain('×7')
  })

  it('dismisses only when the player confirms the pickup', () => {
    const onContinue = vi.fn()
    act(() => {
      root?.render(<EmptyScrollRewardReveal count={7} onContinue={onContinue} />)
    })

    expect(onContinue).not.toHaveBeenCalled()
    const button = host?.querySelector('button')
    expect(button?.textContent).toContain('Continue')
    act(() => button?.click())
    expect(onContinue).toHaveBeenCalledTimes(1)
  })
})
