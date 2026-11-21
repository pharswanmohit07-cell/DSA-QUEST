export const TILESET_EXTRUSION = 1

export const extrudedTilesetCache = new Map<string, HTMLCanvasElement>()

export function buildTilesetCacheKey(
  name: string,
  imageWidth: number,
  imageHeight: number,
  tileWidth: number,
  tileHeight: number,
  firstGid: number,
): string {
  return [name, imageWidth, imageHeight, tileWidth, tileHeight, firstGid].join(':')
}

function monotonicNow(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function waitUntilVisible(): Promise<void> {
  if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') return
      document.removeEventListener('visibilitychange', handleVisibility)
      resolve()
    }
    document.addEventListener('visibilitychange', handleVisibility)
  })
}

async function waitForCooperativeTurn(): Promise<void> {
  await waitUntilVisible()
  if (typeof window === 'undefined') {
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    return
  }
  await new Promise<void>((resolve) => {
    type IdleWindow = Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
    }
    const idleWindow = window as IdleWindow
    if (idleWindow.requestIdleCallback) {
      idleWindow.requestIdleCallback(() => resolve(), { timeout: 80 })
    } else if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => window.setTimeout(resolve, 0))
    } else {
      window.setTimeout(resolve, 0)
    }
  })
}

function fillTransparentTileEdges(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  makeEdgesOpaque: boolean,
): void {
  const image = context.getImageData(x, y, width, height)
  const { data } = image

  // Transparent pixels in the source PNGs have black RGB values. Their alpha
  // is correct, but WebGL can interpolate those RGB values at a sub-pixel
  // boundary and expose them as black specks. Flood the RGB color from the
  // nearest opaque pixel through the whole tile while leaving alpha untouched.
  // This also handles transparent corner pixels inside a tile, which a simple
  // one-pixel atlas extrusion cannot fix.
  const visited = new Uint8Array(width * height)
  const queue: number[] = []
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    if (data[pixel * 4 + 3] > 0) {
      visited[pixel] = 1
      queue.push(pixel)
    }
  }
  for (let head = 0; head < queue.length; head += 1) {
    const pixel = queue[head]
    const sourceX = pixel % width
    const sourceY = Math.floor(pixel / width)
    const neighbors = [
      sourceX > 0 ? pixel - 1 : -1,
      sourceX + 1 < width ? pixel + 1 : -1,
      sourceY > 0 ? pixel - width : -1,
      sourceY + 1 < height ? pixel + width : -1,
    ]
    for (const neighbor of neighbors) {
      if (neighbor < 0 || visited[neighbor]) continue
      const sourceOffset = pixel * 4
      const targetOffset = neighbor * 4
      data[targetOffset] = data[sourceOffset]
      data[targetOffset + 1] = data[sourceOffset + 1]
      data[targetOffset + 2] = data[sourceOffset + 2]
      visited[neighbor] = 1
      queue.push(neighbor)
    }
  }

  // The old implementation searched an expanding square around every
  // transparent edge pixel. That was visually correct but very CPU-heavy on
  // mobile. For a 1px extrusion we only need the nearest opaque pixel inward
  // along the same edge, which produces the same edge-colour result at a tiny
  // fraction of the work.
  const copyFromInward = (edgeX: number, edgeY: number, stepX: number, stepY: number) => {
    const offset = (edgeY * width + edgeX) * 4
    if (data[offset + 3] !== 0) {
      return
    }

    let sourceOffset = -1
    let px = edgeX + stepX
    let py = edgeY + stepY
    while (px >= 0 && py >= 0 && px < width && py < height) {
      const candidateOffset = (py * width + px) * 4
      if (data[candidateOffset + 3] > 0) {
        sourceOffset = candidateOffset
        break
      }
      px += stepX
      py += stepY
    }

    if (sourceOffset >= 0) {
      data[offset] = data[sourceOffset]
      data[offset + 1] = data[sourceOffset + 1]
      data[offset + 2] = data[sourceOffset + 2]
      // Transparent atlas pixels still need neighboring RGB values so WebGL
      // interpolation cannot pull black from the texture's transparent RGB.
      // Ground tiles are the map's base surface, so their authored holes must
      // also become opaque; decorative tiles retain their transparency.
      if (makeEdgesOpaque) data[offset + 3] = 255
    }
  }

  for (let px = 0; px < width; px += 1) {
    copyFromInward(px, 0, 0, 1)
    copyFromInward(px, height - 1, 0, -1)
  }
  for (let py = 1; py < height - 1; py += 1) {
    copyFromInward(0, py, 1, 0)
    copyFromInward(width - 1, py, -1, 0)
  }

  if (makeEdgesOpaque) {
    for (let pixel = 0; pixel < width * height; pixel += 1) {
      const offset = pixel * 4
      if (data[offset + 3] === 0 && visited[pixel]) data[offset + 3] = 255
    }
  }

  context.putImageData(image, x, y)
}

export async function extrudeTilesetCooperatively(
  source: CanvasImageSource,
  columns: number,
  rows: number,
  tileWidth: number,
  tileHeight: number,
  firstGid: number,
  groundTileIds: ReadonlySet<number>,
  options: {
    batchSize?: number
    yieldControl?: () => Promise<void>
    onBatchDuration?: (durationMs: number) => void
  } = {},
): Promise<HTMLCanvasElement> {
  const margin = TILESET_EXTRUSION
  const spacing = TILESET_EXTRUSION * 2
  const canvas = document.createElement('canvas')
  canvas.width = columns * tileWidth + (columns - 1) * spacing + margin * 2
  canvas.height = rows * tileHeight + (rows - 1) * spacing + margin * 2

  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('Unable to create a canvas context for tileset extrusion')
  }
  context.imageSmoothingEnabled = false
  const batchSize = Math.max(1, Math.floor(options.batchSize ?? 8))
  const yieldControl = options.yieldControl ?? waitForCooperativeTurn
  const totalTiles = columns * rows
  let processedTiles = 0
  let batchStartedAt = monotonicNow()

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const sourceX = column * tileWidth
      const sourceY = row * tileHeight
      const targetX = margin + column * (tileWidth + spacing)
      const targetY = margin + row * (tileHeight + spacing)

      context.drawImage(
        source,
        sourceX,
        sourceY,
        tileWidth,
        tileHeight,
        targetX,
        targetY,
        tileWidth,
        tileHeight,
      )
      fillTransparentTileEdges(
        context,
        targetX,
        targetY,
        tileWidth,
        tileHeight,
        groundTileIds.has(firstGid + row * columns + column),
      )
      context.drawImage(canvas, targetX, targetY, tileWidth, 1, targetX, targetY - 1, tileWidth, 1)
      context.drawImage(
        canvas,
        targetX,
        targetY + tileHeight - 1,
        tileWidth,
        1,
        targetX,
        targetY + tileHeight,
        tileWidth,
        1,
      )
      context.drawImage(canvas, targetX, targetY, 1, tileHeight, targetX - 1, targetY, 1, tileHeight)
      context.drawImage(
        canvas,
        targetX + tileWidth - 1,
        targetY,
        1,
        tileHeight,
        targetX + tileWidth,
        targetY,
        1,
        tileHeight,
      )
      context.drawImage(canvas, targetX, targetY, 1, 1, targetX - 1, targetY - 1, 1, 1)
      context.drawImage(
        canvas,
        targetX + tileWidth - 1,
        targetY,
        1,
        1,
        targetX + tileWidth,
        targetY - 1,
        1,
        1,
      )
      context.drawImage(
        canvas,
        targetX,
        targetY + tileHeight - 1,
        1,
        1,
        targetX - 1,
        targetY + tileHeight,
        1,
        1,
      )
      context.drawImage(
        canvas,
        targetX + tileWidth - 1,
        targetY + tileHeight - 1,
        1,
        1,
        targetX + tileWidth,
        targetY + tileHeight,
        1,
        1,
      )
      processedTiles += 1
      if (processedTiles < totalTiles && processedTiles % batchSize === 0) {
        options.onBatchDuration?.(Math.max(0, monotonicNow() - batchStartedAt))
        await yieldControl()
        batchStartedAt = monotonicNow()
      }
    }
  }

  options.onBatchDuration?.(Math.max(0, monotonicNow() - batchStartedAt))
  return canvas
}

