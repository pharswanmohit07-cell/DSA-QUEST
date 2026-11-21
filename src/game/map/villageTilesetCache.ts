import villageMapUrl from '../../assets/tiles/ninja-village/MAP.json?url'
import fieldTilesetUrl from '../../assets/tiles/ninja-village/TilesetField.png'
import floorTilesetUrl from '../../assets/tiles/ninja-village/TilesetFloor.png'
import houseTilesetUrl from '../../assets/tiles/ninja-village/TilesetHouse.png'
import natureTilesetUrl from '../../assets/tiles/ninja-village/TilesetNature.png'
import reliefTilesetUrl from '../../assets/tiles/ninja-village/TilesetRelief.png'
import reliefDetailTilesetUrl from '../../assets/tiles/ninja-village/TilesetReliefDetail.png'
import waterTilesetUrl from '../../assets/tiles/ninja-village/TilesetWater.png'
import { buildTilesetCacheKey, createRetryableMemoizedPromise, extrudedTilesetCache, extrudeTilesetCooperatively } from './tilesetExtrusion'
import { markPerformance, recordWorkDuration } from '../performance/performanceDiagnostics'
import { MAP_LAYER_NAMES } from './mapLayers'

type TiledMapJson = {
  tilewidth?: number
  tileheight?: number
  tilesets?: Array<{
    firstgid: number
    name?: string
    source?: string
  }>
  layers?: Array<{
    name: string
    data?: number[]
  }>
}

const tilesetImageUrls: Record<string, string> = {
  TilesetField: fieldTilesetUrl,
  TilesetFloor: floorTilesetUrl,
  TilesetHouse: houseTilesetUrl,
  TilesetNature: natureTilesetUrl,
  TilesetRelief: reliefTilesetUrl,
  TilesetReliefDetail: reliefDetailTilesetUrl,
  TilesetWater: waterTilesetUrl,
}

function loadTilesetImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Unable to prewarm tileset image: ${url}`))
    image.src = url
    if (image.complete && image.naturalWidth > 0) resolve(image)
  })
}

/**
 * Prepares every village tileset cooperatively before Phaser constructs the
 * map. The HomeScreen and GameWorld import this small module instead of
 * importing the much larger Phaser MainScene bundle just to warm the cache.
 */
const prepareVillageTilesetsOnce = createRetryableMemoizedPromise(async () => {
  markPerformance('asset-preparation-started')
  const response = await fetch(villageMapUrl, { cache: 'force-cache' })
  if (!response.ok) throw new Error('Unable to prewarm the village map')
  const mapJson = await response.json() as TiledMapJson
  const tileWidth = Number(mapJson.tilewidth)
  const tileHeight = Number(mapJson.tileheight)
  const groundData = mapJson.layers?.find(
    (layer) => layer.name === MAP_LAYER_NAMES.ground,
  )?.data

  if (
    tileWidth <= 0 ||
    tileHeight <= 0 ||
    !Array.isArray(groundData) ||
    !Array.isArray(mapJson.tilesets) ||
    mapJson.tilesets.length === 0
  ) {
    throw new Error('Village map data is not ready for asset prewarming')
  }

  const groundTileIds = new Set(groundData.filter((tileId) => tileId > 0))
  const tilesets = mapJson.tilesets.map((tileset) => {
    const sourceName = tileset.source?.split(/[\\/]/).pop()?.replace(/\.tsx?$/i, '')
    const name = tileset.name ?? sourceName
    const url = name ? tilesetImageUrls[name] : undefined
    if (!name || !url) {
      throw new Error(`Village tileset '${name ?? 'unknown'}' has no registered image URL`)
    }
    return { tileset, name, url }
  })

  // Fetch source images in parallel, but perform canvas pixel work in short
  // batches so the main thread remains responsive during menu warm-up.
  const sources = await Promise.all(tilesets.map(({ url }) => loadTilesetImage(url)))
  for (let index = 0; index < tilesets.length; index += 1) {
    const entry = tilesets[index]
    const image = sources[index]
    if (!entry || !image) throw new Error('A village tileset image did not load')

    const columns = Math.floor(image.width / tileWidth)
    const rows = Math.floor(image.height / tileHeight)
    if (
      columns < 1 ||
      rows < 1 ||
      image.width % tileWidth !== 0 ||
      image.height % tileHeight !== 0
    ) {
      throw new Error(`Tileset '${entry.name}' dimensions must align exactly to the map tile size`)
    }

    const cacheKey = buildTilesetCacheKey(
      entry.name,
      image.width,
      image.height,
      tileWidth,
      tileHeight,
      entry.tileset.firstgid,
    )
    if (!extrudedTilesetCache.has(cacheKey)) {
      const extruded = await extrudeTilesetCooperatively(
        image,
        columns,
        rows,
        tileWidth,
        tileHeight,
        entry.tileset.firstgid,
        groundTileIds,
        {
          batchSize: 8,
          onBatchDuration: (durationMs) => recordWorkDuration('tileset-extrusion', durationMs),
        },
      )
      extrudedTilesetCache.set(cacheKey, extruded)
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent<number>('dsaq:asset-progress', {
        detail: (index + 1) / tilesets.length,
      }))
    }
  }
  markPerformance('asset-preparation-finished')
})

export function warmVillageTileExtrusionCache(): Promise<void> {
  return prepareVillageTilesetsOnce()
}
