import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getPerformanceSnapshot,
  markPerformance,
  measurePerformance,
  recordFrame,
  resetPerformanceDiagnosticsForTests,
} from './performanceDiagnostics'

describe('preview performance diagnostics', () => {
  beforeEach(() => {
    resetPerformanceDiagnosticsForTests()
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_ENABLE_PREVIEW_PERFORMANCE_DIAGNOSTICS', 'false')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    resetPerformanceDiagnosticsForTests()
  })

  it('does not write performance entries or keep samples when disabled', () => {
    const mark = vi.spyOn(performance, 'mark')
    const measure = vi.spyOn(performance, 'measure')

    markPerformance('home-rendered')
    expect(measurePerformance('time-to-play', 'game-start-requested', 'world-ready')).toBeNull()
    recordFrame(80)

    expect(mark).not.toHaveBeenCalled()
    expect(measure).not.toHaveBeenCalled()
    expect(getPerformanceSnapshot()).toMatchObject({
      enabled: false,
      marks: [],
      measures: [],
      frameSamples: [],
      longFrameCount: 0,
    })
  })

  it('records named marks and measures only when enabled', () => {
    vi.stubEnv('VITE_ENABLE_PREVIEW_PERFORMANCE_DIAGNOSTICS', 'true')
    const mark = vi.spyOn(performance, 'mark')
    const measure = vi.spyOn(performance, 'measure')
    const now = vi.spyOn(performance, 'now')
    now.mockReturnValueOnce(100).mockReturnValueOnce(245)

    markPerformance('game-start-requested')
    markPerformance('world-ready')

    expect(measurePerformance('time-to-play', 'game-start-requested', 'world-ready')).toBe(145)
    expect(mark).toHaveBeenCalledTimes(2)
    expect(measure).toHaveBeenCalledTimes(1)
    expect(getPerformanceSnapshot().measures).toEqual([
      { name: 'time-to-play', durationMs: 145 },
    ])
  })

  it('keeps only the most recent 120 frame samples and counts long frames', () => {
    vi.stubEnv('VITE_ENABLE_PREVIEW_PERFORMANCE_DIAGNOSTICS', 'true')

    for (let frame = 0; frame < 140; frame += 1) {
      recordFrame(frame === 139 ? 80 : 16)
    }

    const snapshot = getPerformanceSnapshot()
    expect(snapshot.frameSamples).toHaveLength(120)
    expect(snapshot.frameSamples.at(-1)).toBe(80)
    expect(snapshot.longFrameCount).toBe(1)
  })

  it('returns null for missing marks rather than throwing', () => {
    vi.stubEnv('VITE_ENABLE_PREVIEW_PERFORMANCE_DIAGNOSTICS', 'true')

    expect(measurePerformance('missing', 'game-start-requested', 'world-ready')).toBeNull()
    expect(getPerformanceSnapshot().measures).toEqual([])
  })
})
