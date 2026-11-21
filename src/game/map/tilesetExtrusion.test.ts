import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildTilesetCacheKey,
  createRetryableMemoizedPromise,
  extrudedTilesetCache,
  extrudeTilesetCooperatively,
  waitUntilVisible,
} from './tilesetExtrusion'

function installFakeCanvas() {
  const writtenPixels: Uint8ClampedArray[] = []
  const context = {
    imageSmoothingEnabled: true,
    drawImage: vi.fn(),
    getImageData: vi.fn((_x: number, _y: number, width: number, height: number) => {
      const data = new Uint8ClampedArray(width * height * 4)
      const center = (Math.floor(height / 2) * width + Math.floor(width / 2)) * 4
      data[center] = 180
      data[center + 1] = 90
      data[center + 2] = 30
      data[center + 3] = 255
      return { data, width, height } as ImageData
    }),
    putImageData: vi.fn((imageData: ImageData) => writtenPixels.push(imageData.data)),
  }
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
  } as unknown as HTMLCanvasElement
  vi.spyOn(document, 'createElement').mockReturnValue(canvas)
  return { canvas, context, writtenPixels }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  extrudedTilesetCache.clear()
})

describe('cooperative tileset extrusion', () => {
  it('preserves atlas dimensions and yields between bounded tile batches', async () => {
    const { canvas, context } = installFakeCanvas()
    const yieldControl = vi.fn(async () => undefined)
    const batchDurations: number[] = []

    const result = await extrudeTilesetCooperatively(
      {} as HTMLImageElement,
      2,
      2,
      16,
      16,
      10,
      new Set(),
      { batchSize: 2, yieldControl, onBatchDuration: (duration) => batchDurations.push(duration) },
    )

    expect(result).toBe(canvas)
    expect(result.width).toBe(36)
    expect(result.height).toBe(36)
    expect(context.drawImage).toHaveBeenCalledTimes(36)
    expect(context.getImageData).toHaveBeenCalledTimes(4)
    expect(yieldControl).toHaveBeenCalledTimes(1)
    expect(batchDurations).toHaveLength(2)
    expect(batchDurations.every((duration) => duration >= 0)).toBe(true)
  })

  it('keeps decorative tile transparency but fills ground tile transparency', async () => {
    const { writtenPixels } = installFakeCanvas()

    await extrudeTilesetCooperatively(
      {} as HTMLImageElement,
      2,
      1,
      16,
      16,
      41,
      new Set([41]),
      { batchSize: 8, yieldControl: async () => undefined },
    )

    expect(writtenPixels).toHaveLength(2)
    expect(writtenPixels[0]?.[3]).toBe(255)
    expect(writtenPixels[1]?.[3]).toBe(0)
  })

  it('builds deterministic cache keys and shares the exported cache', () => {
    const first = buildTilesetCacheKey('TilesetField', 256, 256, 16, 16, 1)
    const second = buildTilesetCacheKey('TilesetField', 256, 256, 16, 16, 1)

    expect(first).toBe(second)
    expect(first).toBe('TilesetField:256:256:16:16:1')
    const canvas = {} as HTMLCanvasElement
    extrudedTilesetCache.set(first, canvas)
    expect(extrudedTilesetCache.get(second)).toBe(canvas)
  })
  it('shares an in-flight preparation between concurrent callers', async () => {
    let resolveWork: ((value: string) => void) | undefined
    const work = vi.fn(() => new Promise<string>((resolve) => {
      resolveWork = resolve
    }))
    const prepare = createRetryableMemoizedPromise(work)

    const first = prepare()
    const second = prepare()
    expect(first).toBe(second)

    await Promise.resolve()
    expect(work).toHaveBeenCalledTimes(1)
    resolveWork?.('ready')
    await expect(Promise.all([first, second])).resolves.toEqual(['ready', 'ready'])
    expect(prepare()).toBe(first)
  })

  it('allows preparation to retry after a rejected attempt', async () => {
    const work = vi.fn()
      .mockRejectedValueOnce(new Error('temporary asset failure'))
      .mockResolvedValueOnce('ready')
    const prepare = createRetryableMemoizedPromise(work)

    await expect(prepare()).rejects.toThrow('temporary asset failure')
    await expect(prepare()).resolves.toBe('ready')
    expect(work).toHaveBeenCalledTimes(2)
  })

  it('pauses while the document is hidden and resumes on visibility change', async () => {
    let visibility: DocumentVisibilityState = 'hidden'
    const listeners = new Set<EventListener>()
    const fakeDocument = {
      get visibilityState() {
        return visibility
      },
      addEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === 'visibilitychange' && typeof listener === 'function') listeners.add(listener)
      }),
      removeEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === 'visibilitychange' && typeof listener === 'function') listeners.delete(listener)
      }),
    } as unknown as Document
    vi.stubGlobal('document', fakeDocument)

    let resumed = false
    const waiting = waitUntilVisible().then(() => {
      resumed = true
    })

    await Promise.resolve()
    expect(resumed).toBe(false)
    expect(fakeDocument.addEventListener).toHaveBeenCalledOnce()

    visibility = 'visible'
    for (const listener of [...listeners]) listener(new Event('visibilitychange'))
    await waiting

    expect(resumed).toBe(true)
    expect(fakeDocument.removeEventListener).toHaveBeenCalledOnce()
  })

})
