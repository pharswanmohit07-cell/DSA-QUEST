import Phaser from 'phaser'
import { GameAutoTester } from '../GameAutoTester'
import { DialogueController, isNpcNearby } from '../dialogue/DialogueController'
import { InteractionPrompt } from '../npc/InteractionPrompt'
import { Npc } from '../npc/Npc'
import { WanderAi } from '../npc/WanderAi'
import { QuestManager } from '../quests/QuestManager'
import { getPlayerProfile } from '../stats/playerStats'
import { NameTag, NAME_TAG_STYLE, NPC_TAG_SHOW_DISTANCE, NPC_TAG_HIDE_DISTANCE, NPC_TAG_FADE_MS } from '../playerNameTag'
import { challengeStore, registerChallengeSceneBridge } from '../challenge/challengeStore'
import { startAdventureMusic } from '../../audio/music'
import { playFootstep, playVoiceCue } from '../../audio/soundEffects'
import type { ChallengeTarget } from '../challenge/challengeTypes'
import type { MultiplayerGameState, MultiplayerRoom } from '../multiplayer/realtime'
import { VILLAGE_NPCS } from '../npc/villageNpcs'
import { MAP_LAYER_DEPTHS, MAP_LAYER_NAMES } from '../map/mapLayers'
import { ABOVE_PLAYER_TILE_IDS, NON_SOLID_OVERHANG_TILE_IDS } from '../map/abovePlayerTileIds'
import { TORII_GATE_LOCK } from '../map/gateLock'
import { isWalkableTile } from '../map/walkableTileIds'
import {
  VILLAGE_WALK_BEHIND_CELLS,
  VILLAGE_FORCE_SOLID_CELLS,
  VILLAGE_FENCE_OVERLAY_CELLS as CompoundFenceOverlayCells,
} from '../map/villageRegionRules'
import villageMapUrl from '../../assets/tiles/ninja-village/MAP.json?url'
import hunterIdleUrl from '../../assets/tiles/ninja-village/Hunter/SeparateAnim/Idle.png'
import hunterWalkUrl from '../../assets/tiles/ninja-village/Hunter/SeparateAnim/Walk.png'
import fieldTilesetUrl from '../../assets/tiles/ninja-village/TilesetField.png'
import floorTilesetUrl from '../../assets/tiles/ninja-village/TilesetFloor.png'
import houseTilesetUrl from '../../assets/tiles/ninja-village/TilesetHouse.png'
import natureTilesetUrl from '../../assets/tiles/ninja-village/TilesetNature.png'
import reliefTilesetUrl from '../../assets/tiles/ninja-village/TilesetRelief.png'
import reliefDetailTilesetUrl from '../../assets/tiles/ninja-village/TilesetReliefDetail.png'
import waterTilesetUrl from '../../assets/tiles/ninja-village/TilesetWater.png'
import elderIdleUrl from '../../assets/tiles/ninja-village/Elder/Idle.png'
import elderWalkUrl from '../../assets/tiles/ninja-village/Elder/Walk.png'
import elderPortraitUrl from '../../assets/tiles/ninja-village/Elder/Faceset.png'
import keyEUrl from '../../assets/UI/KeyE.png'
import dialogInfoUrl from '../../assets/UI/DialogInfo.png'

type DirectionalKeys = {
  up: Phaser.Input.Keyboard.Key
  down: Phaser.Input.Keyboard.Key
  left: Phaser.Input.Keyboard.Key
  right: Phaser.Input.Keyboard.Key
}

export type TouchDirection = keyof DirectionalKeys

type FacingDirection = 'down' | 'up' | 'left' | 'right'

type TiledMapJson = {
  tilesets: Array<{
    firstgid: number
    name?: string
    source?: string
    [key: string]: unknown
  }>
  layers?: Array<{
    name: string
    type?: string
    width?: number
    height?: number
    data?: number[]
  }>
  [key: string]: unknown
}

const TILESET_EXTRUSION = 1

// Extrusion is a one-time CPU preprocessing step. Keep the generated canvases
// between Phaser instances so returning from the game to the home screen does
// not repeat the expensive work.
const extrudedTilesetCache = new Map<string, HTMLCanvasElement>()

function fillTransparentGroundEdges(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const image = context.getImageData(x, y, width, height)
  const { data } = image

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
      data[offset + 3] = 255
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

  context.putImageData(image, x, y)
}

function extrudeTileset(
  source: CanvasImageSource,
  columns: number,
  rows: number,
  tileWidth: number,
  tileHeight: number,
  firstGid: number,
  groundTileIds: ReadonlySet<number>,
): HTMLCanvasElement {
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
      if (groundTileIds.has(firstGid + row * columns + column)) {
        fillTransparentGroundEdges(context, targetX, targetY, tileWidth, tileHeight)
      }
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
    }
  }

  return canvas
}

// Tile-sheet extrusion is CPU-heavy on the first play. Prepare one sheet per idle
// turn while the player is on the home screen, so MainScene can reuse these
// canvases instead of doing all of the work in its first visible frame.
const tilesetImageUrls: Record<string, string> = {
  TilesetField: fieldTilesetUrl,
  TilesetFloor: floorTilesetUrl,
  TilesetHouse: houseTilesetUrl,
  TilesetNature: natureTilesetUrl,
  TilesetRelief: reliefTilesetUrl,
  TilesetReliefDetail: reliefDetailTilesetUrl,
  TilesetWater: waterTilesetUrl,
}

let tilesetWarmPromise: Promise<void> | null = null

function waitForIdleTurn(): Promise<void> {
  return new Promise((resolve) => {
    type IdleWindow = Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
    }
    const idleWindow = window as IdleWindow
    if (idleWindow.requestIdleCallback) {
      idleWindow.requestIdleCallback(() => resolve(), { timeout: 250 })
    } else {
      window.setTimeout(resolve, 12)
    }
  })
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
 * Background warm-up for the existing extrusion cache. Failure is non-fatal:
 * MainScene retains its synchronous fallback and produces the same tile art.
 */
export function warmVillageTileExtrusionCache(): Promise<void> {
  if (tilesetWarmPromise) return tilesetWarmPromise

  tilesetWarmPromise = (async () => {
    const response = await fetch(villageMapUrl, { cache: 'force-cache' })
    if (!response.ok) throw new Error('Unable to prewarm the village map')
    const mapJson = await response.json() as TiledMapJson
    const tileWidth = Number(mapJson['tilewidth'])
    const tileHeight = Number(mapJson['tileheight'])
    const groundData = mapJson.layers?.find(
      (layer) => layer.name === MAP_LAYER_NAMES.ground,
    )?.data

    if (
      tileWidth <= 0 ||
      tileHeight <= 0 ||
      !Array.isArray(groundData) ||
      !Array.isArray(mapJson.tilesets)
    ) {
      throw new Error('Village map data is not ready for asset prewarming')
    }

    const groundTileIds = new Set(groundData.filter((tileId) => tileId > 0))
    for (const tileset of mapJson.tilesets) {
      const sourceName = tileset.source?.split(/[\\/]/).pop()?.replace(/\.tsx?$/i, '')
      const name = tileset.name ?? sourceName
      const url = name ? tilesetImageUrls[name] : undefined
      if (!name || !url) continue

      const image = await loadTilesetImage(url)
      const columns = Math.floor(image.width / tileWidth)
      const rows = Math.floor(image.height / tileHeight)
      if (
        columns < 1 ||
        rows < 1 ||
        image.width % tileWidth !== 0 ||
        image.height % tileHeight !== 0
      ) {
        // Let MainScene report malformed artwork with its existing error path.
        continue
      }

      const cacheKey = [
        name,
        image.width,
        image.height,
        tileWidth,
        tileHeight,
        tileset.firstgid,
      ].join(':')
      if (extrudedTilesetCache.has(cacheKey)) continue

      await waitForIdleTurn()
      if (extrudedTilesetCache.has(cacheKey)) continue
      extrudedTilesetCache.set(
        cacheKey,
        extrudeTileset(
          image,
          columns,
          rows,
          tileWidth,
          tileHeight,
          tileset.firstgid,
          groundTileIds,
        ),
      )
    }
  })().catch((error: unknown) => {
    tilesetWarmPromise = null
    throw error
  })

  return tilesetWarmPromise
}

const directionColumns: Record<FacingDirection, number> = {
  down: 0,
  up: 1,
  left: 2,
  right: 3,
}
const walkFrameCountPerDirection = 4
const hunterAnimationFrameRate = 9
const ARRAY_STACK_TARGETS: readonly ChallengeTarget[] = [
  [
    { type: 'push', value: 5 },
    { type: 'push', value: 8 },
    { type: 'pop' },
    { type: 'push', value: 3 },
  ],
  [
    { type: 'push', value: 7 },
    { type: 'push', value: 4 },
    { type: 'pop' },
    { type: 'push', value: 9 },
  ],
  [
    { type: 'push', value: 2 },
    { type: 'push', value: 6 },
    { type: 'push', value: 1 },
    { type: 'pop' },
  ],
  [
    { type: 'push', value: 9 },
    { type: 'push', value: 3 },
    { type: 'pop' },
    { type: 'push', value: 7 },
  ],
  [
    { type: 'push', value: 4 },
    { type: 'push', value: 8 },
    { type: 'pop' },
    { type: 'push', value: 6 },
  ],
]

let lastArrayStackTargetIndex = -1

function getRandomArrayStackTarget(): ChallengeTarget {
  let index = Math.floor(Math.random() * ARRAY_STACK_TARGETS.length)
  if (index === lastArrayStackTargetIndex) {
    index = (index + 1) % ARRAY_STACK_TARGETS.length
  }
  lastArrayStackTargetIndex = index
  return ARRAY_STACK_TARGETS[index]
}

/**
 * Depth offset for the player and NPCs.
 *
 * Characters are sorted by their feet in the same numeric band as the tilemap
 * layers: ground at 0, obstacles at 10, and the above-player layer at 1000.
 * Sorting against the fixed obstacle layer lets tall overhangs hide the player
 * when they walk behind them.
 */
const CHARACTER_DEPTH_BASE = 100

type RemotePlayerView = {
  sprite: Phaser.GameObjects.Sprite
  label: Phaser.GameObjects.Text
  targetX: number
  targetY: number
  direction: FacingDirection
  moving: boolean
}

// Coordinate-only walk-behind cells for tall village objects.
// Only upper cells are listed; the lowest row of each object remains its solid
// footprint. These cells are duplicated onto the above-player layer and made
// non-colliding, using the same mechanism already used for existing overhang art.
const VILLAGE_PILLAR_OVERHANGS = new Set([
  // Existing stone pillar upper cells.
  '10,20',
  '14,20',
  '10,21',
  '14,21',
  '9,22',
  '10,22',
  '14,22',
  '15,22',

  // West village building; y11 remains the solid footprint.
  '0,7', '1,7', '2,7', '3,7',
  '0,8', '1,8', '2,8', '3,8',
  '0,9', '1,9', '2,9', '3,9',
  '0,10', '1,10', '2,10', '3,10',

  // Central village house; y11 remains the solid footprint.
  '14,5', '15,5', '16,5', '17,5',
  '14,6', '15,6', '16,6', '17,6',
  '14,7', '15,7', '16,7', '17,7',
  '14,8', '15,8', '16,8', '17,8',
  '14,9', '15,9', '16,9', '17,9',
  '14,10', '15,10', '16,10', '17,10',

  // East village house; y11 remains the solid footprint.
  '19,8', '20,8', '21,8', '22,8',
  '19,9', '20,9', '21,9', '22,9',
  '19,10', '20,10', '21,10', '22,10',

  // Tall tree between the two village houses; y11 remains the footprint.
  '18,8',
  '18,9',
  '18,10',

  // Tall path-side props; their lower row remains solid.
  '10,8',
  '13,8',

  // Region-scoped walk-behind cells (east rocks and dojo posts), see
  // src/game/map/villageRegionRules.ts.
  ...VILLAGE_WALK_BEHIND_CELLS,
])
// Note: VILLAGE_FORCE_SOLID_CELLS are deliberately NOT overhangs. They are
// consumed directly by setupObstacleCollisions() (kept solid) and
// duplicateAbovePlayerTiles() (never drawn over the player).

// Solid cells that must additionally be drawn over the player, see
// src/game/map/villageRegionRules.ts. Collision is unchanged.
const VILLAGE_FENCE_OVERLAY_CELLS = CompoundFenceOverlayCells

const WEST_HOUSE_OPEN_CELLS = new Set([
  '0,18', '2,18', '6,18', '8,18', // walkable grass beside arch posts
  '1,18', '7,18', // arch tops
  '1,19', '7,19', // open gates
])
const WEST_HOUSE_FOREGROUND_CELLS = new Set([
  '1,18', '7,18', // arch tops drawn over the player
  '9,14', '9,15', '9,16', '9,17', '9,18', // east fence
  '0,19', '2,19', '3,19', '4,19', '5,19', '6,19', '8,19', '9,19', // fence row
])

// The middle-path wall is painted across two ground rows: the orange-topped
// upper planks and the lower timber planks. Both rows must block entry.
const WOODEN_WALL_TOP_TILE_IDS = new Set([1542, 1543, 1544])
const WOODEN_WALL_TILE_IDS = new Set([1542, 1543, 1544, 1575, 1576, 1577])

const GATE_HINT_MESSAGE = 'The gate is closed. Talk to the old man to open it.'
const GATE_HINT_ZONE = {
  // Keep the trigger on the player's side of the sealed threshold.
  minX: 10.5,
  maxX: 13.5,
  minY: 24,
  maxY: 27.5,
}
const GATE_HINT_COOLDOWN_MS = 4000
const GATE_HINT_VISIBLE_MS = 2500

export const PLAYER_SPEED_KEY = 'dsa-quest-player-speed-v5'
export const PLAYER_SPEED_MIN = 50
export const PLAYER_SPEED_MAX = 270
export const DEFAULT_PLAYER_SPEED = playerPercentToSpeed(30)

export function getStoredPlayerSpeed(): number {
  if (typeof window === 'undefined') {
    return DEFAULT_PLAYER_SPEED
  }
  try {
    const stored = Number(localStorage.getItem(PLAYER_SPEED_KEY))
    if (Number.isFinite(stored)) {
      return Phaser.Math.Clamp(stored, PLAYER_SPEED_MIN, PLAYER_SPEED_MAX)
    }
  } catch {
    // Fall back to the default when localStorage is unavailable.
  }
  return DEFAULT_PLAYER_SPEED
}

export function playerSpeedToPercent(speed: number): number {
  return Math.round(((Phaser.Math.Clamp(speed, PLAYER_SPEED_MIN, PLAYER_SPEED_MAX) - PLAYER_SPEED_MIN) / (PLAYER_SPEED_MAX - PLAYER_SPEED_MIN)) * 100)
}

export function playerPercentToSpeed(percent: number): number {
  const clampedPercent = Phaser.Math.Clamp(percent, 0, 100)
  return Math.round(PLAYER_SPEED_MIN + ((PLAYER_SPEED_MAX - PLAYER_SPEED_MIN) * clampedPercent) / 100)
}

export class MainScene extends Phaser.Scene {
  onRequestExit?: () => void
  private player!: Phaser.GameObjects.Sprite
  private playerNameTag: NameTag | null = null
  private readonly npcNameTags = new Map<string, NameTag>()
  private readonly handlePlayerNameChanged = (event: Event) => {
    const name = (event as CustomEvent<string>).detail
    if (typeof name === 'string') this.playerNameTag?.setText(name)
  }
  private wasdKeys!: DirectionalKeys
  private arrowKeys!: DirectionalKeys
  private playerSpeed = getStoredPlayerSpeed()
  private map!: Phaser.Tilemaps.Tilemap
  private groundLayer!: Phaser.Tilemaps.TilemapLayer
  private obstaclesLayer!: Phaser.Tilemaps.TilemapLayer
  private foregroundLayer!: Phaser.Tilemaps.TilemapLayer
  private layerPreviewGraphics: Phaser.GameObjects.Graphics | null = null
  private layerPreviewLegend: Phaser.GameObjects.Text | null = null
  private layerPreviewEnabled = false
  private readonly westHouseForegroundTiles = new Set<string>()
  private facingDirection: FacingDirection = 'down'
  private isMoving = false
  private readonly npcs: Npc[] = []
  private readonly wanderAis = new Map<string, WanderAi>()
  private dialogue!: DialogueController
  private interactionPrompt!: InteractionPrompt
  private interactKey!: Phaser.Input.Keyboard.Key
  private spaceKey!: Phaser.Input.Keyboard.Key
  private escapeKey!: Phaser.Input.Keyboard.Key
  private readonly touchDirections: Record<TouchDirection, boolean> = {
    up: false,
    down: false,
    left: false,
    right: false,
  }
  private readonly handleInteractionKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'e' || event.key === 'E' || event.code === 'Space') {
      this.interactPressedLatch = true
    }
  }
  /** Set by a DOM keydown listener, consumed by `isInteractJustPressed`. */
  private interactPressedLatch = false
  /** Set while a conversation is open, to freeze player movement. */
  private isDialogueOpen = false
  /**
   * True while the torii gate is sealed by the quest. The gate starts locked so
   * the northern snowfield is out of reach until the challenge is solved.
   */
  private isGateLocked = true
  private gateHintElement: HTMLDivElement | null = null
  private gateHintVisibleUntil = 0
  private gateHintCooldownUntil = 0
  private gateHintZoneActive = false
  /** True while the stack challenge overlay owns the screen. */
  private isChallengeOpen = false
  private unregisterChallengeSceneBridge: (() => void) | null = null
  private multiplayerRoom: MultiplayerRoom | null = null
  private unsubscribeGameState: (() => void) | null = null
  private readonly remotePlayers = new Map<string, RemotePlayerView>()
  private lastNetworkSendAt = 0

  constructor() {
    super('MainScene')
  }

  preload() {
    this.load.on('loaderror', (...args: unknown[]) => {
      console.error('[DSA Quest] Phaser asset failed to load', ...args)
    })
    this.load.json('map-json', villageMapUrl)
    this.load.spritesheet('hunter-walk', hunterWalkUrl, { frameWidth: 16, frameHeight: 16 })
    this.load.spritesheet('hunter-idle', hunterIdleUrl, { frameWidth: 16, frameHeight: 16 })
    this.load.image('TilesetField', fieldTilesetUrl)
    this.load.image('TilesetFloor', floorTilesetUrl)
    this.load.image('TilesetHouse', houseTilesetUrl)
    this.load.image('TilesetNature', natureTilesetUrl)
    this.load.image('TilesetRelief', reliefTilesetUrl)
    this.load.image('TilesetReliefDetail', reliefDetailTilesetUrl)
    this.load.image('TilesetWater', waterTilesetUrl)
    this.load.spritesheet('elder-idle', elderIdleUrl, { frameWidth: 16, frameHeight: 16 })
    this.load.spritesheet('elder-walk', elderWalkUrl, { frameWidth: 16, frameHeight: 16 })
    this.load.image('elder-portrait', elderPortraitUrl)
    this.load.image('ui-key-e', keyEUrl)
    this.load.spritesheet('ui-dialog-info', dialogInfoUrl, { frameWidth: 20, frameHeight: 16 })
  }

  create() {
    try {
      this.createHunterAnimations()
      this.createElderAnimations()
      this.loadTiledMapAndPhysics()
      startAdventureMusic()
      this.unregisterChallengeSceneBridge = registerChallengeSceneBridge({
        pausePlayer: () => this.pausePlayerForChallenge(),
        resumePlayer: (completedSuccessfully) => this.resumePlayerAfterChallenge(completedSuccessfully),
      })
      window.addEventListener('dsaq:player-name-changed', this.handlePlayerNameChanged)
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.unregisterChallengeSceneBridge?.()
        this.unregisterChallengeSceneBridge = null
        this.unsubscribeGameState?.()
        this.unsubscribeGameState = null
        for (const remote of this.remotePlayers.values()) { remote.sprite.destroy(); remote.label.destroy() }
        this.remotePlayers.clear()
        window.removeEventListener('keydown', this.handleInteractionKeyDown)
        window.removeEventListener('dsaq:player-name-changed', this.handlePlayerNameChanged)
        this.playerNameTag?.destroy()
        this.playerNameTag = null
        for (const tag of this.npcNameTags.values()) tag.destroy()
        this.npcNameTags.clear()
        this.clearTouchDirections()
      })
    } catch (error) {
      console.error('[DSA Quest] MainScene.create failed', error)
      throw error
    }
  }

  private loadTiledMapAndPhysics() {
    const savedGame = QuestManager.getSave()
    if (savedGame) {
      QuestManager.restore(savedGame)
      this.isGateLocked = !QuestManager.isCompleted('array-sorting-challenge')
    }
    const mapJson = structuredClone(this.cache.json.get('map-json')) as TiledMapJson
    const mapTileWidth = Number(mapJson['tilewidth'])
    const mapTileHeight = Number(mapJson['tileheight'])
    if (mapTileWidth <= 0 || mapTileHeight <= 0) {
      throw new Error('Tiled map must define positive tile dimensions')
    }
    const groundLayerData = mapJson.layers?.find(
      (layer) => layer.name === MAP_LAYER_NAMES.ground,
    )?.data
    if (!groundLayerData) {
      throw new Error(`Map is missing tile data for ground layer '${MAP_LAYER_NAMES.ground}'`)
    }
    const groundDecorDefinition = mapJson.layers?.find(
      (layer) => layer.name === MAP_LAYER_NAMES.groundDecor,
    )
    // This visual-only layer is optional so older map exports remain loadable.
    // When present, validate its full grid before Phaser creates it.
    if (
      groundDecorDefinition &&
      (
        groundDecorDefinition.type !== 'tilelayer' ||
        !Array.isArray(groundDecorDefinition.data) ||
        groundDecorDefinition.data.length !== Number(mapJson['width']) * Number(mapJson['height']) ||
        (groundDecorDefinition.width !== undefined && groundDecorDefinition.width !== Number(mapJson['width'])) ||
        (groundDecorDefinition.height !== undefined && groundDecorDefinition.height !== Number(mapJson['height']))
      )
    ) {
      throw new Error(
        `Optional ground decor layer '${MAP_LAYER_NAMES.groundDecor}' must be a tile layer matching the full map size`,
      )
    }
    const groundTileIds = new Set(groundLayerData.filter((tileId) => tileId > 0))
    const tilesetTextureKeys = new Map<string, string>()
    mapJson.tilesets = mapJson.tilesets.map((tileset) => {
      const sourceName = tileset.source?.split(/[\\/]/).pop()?.replace(/\.tsx?$/i, '')
      const name = tileset.name ?? sourceName
      if (!name) {
        throw new Error('Map tileset is missing both a name and a source')
      }
      const texture = this.textures.get(name)
      if (!texture) {
        throw new Error(`Unable to find loaded image for tileset '${name}'`)
      }
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST)
      const image = texture.getSourceImage() as HTMLImageElement
      const columns = Math.floor(image.width / mapTileWidth)
      const rows = Math.floor(image.height / mapTileHeight)
      if (
        columns < 1 ||
        rows < 1 ||
        image.width % mapTileWidth !== 0 ||
        image.height % mapTileHeight !== 0
      ) {
        throw new Error(`Tileset '${name}' dimensions must align exactly to the map tile size`)
      }
      const extrusionCacheKey = [
        name,
        image.width,
        image.height,
        mapTileWidth,
        mapTileHeight,
        tileset.firstgid,
      ].join(':')
      let extruded = extrudedTilesetCache.get(extrusionCacheKey)
      if (!extruded) {
        extruded = extrudeTileset(
          image,
          columns,
          rows,
          mapTileWidth,
          mapTileHeight,
          tileset.firstgid,
          groundTileIds,
        )
        extrudedTilesetCache.set(extrusionCacheKey, extruded)
      }
      const extrudedTextureKey = `${name}-extruded`
      const extrudedTexture = this.textures.addCanvas(extrudedTextureKey, extruded)
      if (!extrudedTexture) {
        throw new Error(`Unable to register extruded texture for tileset '${name}'`)
      }
      extrudedTexture.setFilter(Phaser.Textures.FilterMode.NEAREST)
      tilesetTextureKeys.set(name, extrudedTextureKey)
      const inlineTileset = {
        ...tileset,
        name,
        tilewidth: mapTileWidth,
        tileheight: mapTileHeight,
        margin: TILESET_EXTRUSION,
        spacing: TILESET_EXTRUSION * 2,
        tilecount: columns * rows,
        columns,
        image: `${name}.png`,
        imagewidth: extruded.width,
        imageheight: extruded.height,
      }
      delete inlineTileset.source
      return inlineTileset
    })
    this.cache.tilemap.add('map', {
      format: Phaser.Tilemaps.Formats.TILED_JSON,
      data: mapJson,
    })
    this.map = this.make.tilemap({ key: 'map' })
    const tilesets = this.map.tilesets.map((tileset) => {
      const textureKey = tilesetTextureKeys.get(tileset.name)
      if (!textureKey) {
        throw new Error(`Unable to find extruded texture key for tileset '${tileset.name}'`)
      }
      const image = this.map.addTilesetImage(
        tileset.name,
        textureKey,
        mapTileWidth,
        mapTileHeight,
        TILESET_EXTRUSION,
        TILESET_EXTRUSION * 2,
        tileset.firstgid,
      )
      if (!image) {
        throw new Error(`Unable to load tileset image '${tileset.name}'`)
      }
      return image
    })

    const createLayer = (name: string) => {
      const layer = this.map.createLayer(name, tilesets, 0, 0, false)
      if (!(layer instanceof Phaser.Tilemaps.TilemapLayer)) {
        throw new Error(`Unable to create CPU tilemap layer '${name}'`)
      }
      return layer
    }
    this.groundLayer = createLayer(MAP_LAYER_NAMES.ground)
    this.groundLayer.setDepth(MAP_LAYER_DEPTHS.ground)
    this.setupLakeCollision()

    // Fence art for the roof backdrop is purely decorative: it sits above the
    // ground, below obstacle/roof art, and is never attached to Arcade Physics
    // or copied to the above-player layer. Older map exports may omit it.
    if (groundDecorDefinition) {
      const groundDecorLayer = createLayer(MAP_LAYER_NAMES.groundDecor)
      groundDecorLayer.setDepth(MAP_LAYER_DEPTHS.groundDecor)
      for (let tileY = 0; tileY < groundDecorLayer.layer.height; tileY += 1) {
        for (let tileX = 0; tileX < groundDecorLayer.layer.width; tileX += 1) {
          groundDecorLayer.getTileAt(tileX, tileY)?.setCollision(false, false, false, false, false)
        }
      }
    }

    this.obstaclesLayer = createLayer(MAP_LAYER_NAMES.obstacles)
    this.obstaclesLayer.setDepth(MAP_LAYER_DEPTHS.obstacles)
    this.setupObstacleCollisions()
    this.applyGateLock()
    this.applyWestHouseCellRules()

    this.foregroundLayer = createLayer(MAP_LAYER_NAMES.abovePlayer)
    this.foregroundLayer.setDepth(MAP_LAYER_DEPTHS.abovePlayer)
    this.foregroundLayer.setCollisionByExclusion([-1], false, false)
    for (let tileY = 0; tileY < this.foregroundLayer.layer.height; tileY += 1) {
      for (let tileX = 0; tileX < this.foregroundLayer.layer.width; tileX += 1) {
        this.foregroundLayer.getTileAt(tileX, tileY)?.setCollision(false, false, false, false, false)
      }
    }
    this.duplicateAbovePlayerTiles()
    this.duplicateWoodenWallTopTiles()

    const worldWidth = this.map.widthInPixels
    const worldHeight = this.map.heightInPixels
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight)

    this.player = this.add.sprite(
      savedGame?.position?.x ?? 17.5 * this.map.tileWidth,
      savedGame?.position?.y ?? 25.5 * this.map.tileHeight,
      'hunter-idle',
      0,
    )
    this.physics.add.existing(this.player)
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body
    playerBody.setAllowGravity(false)
    playerBody.setCollideWorldBounds(true)
    // A feet-level body lets the player overlap tall prop artwork while still
    // colliding with the solid base tiles.
    playerBody.setSize(10, 8)
    playerBody.setOffset(3, 7)
    this.applyPlayerDepth()
    this.physics.add.collider(this.player, this.obstaclesLayer)
    this.physics.add.collider(this.player, this.groundLayer)

    // Explicit invisible collision volumes for the two west-yard house footprints.
    // These backstop tile collision so the player cannot enter the house artwork
    // through a transparent/open-looking tile or a tileset collision mismatch.
    // Coordinates use the existing 16x16 map grid: shop x0-2 and dark house x5-8,
    // both spanning rows 14-17. The walkway in front (row 18) remains open.
    const houseCollisionZones = [
      this.add.rectangle(24, 256, 48, 64, 0x000000, 0),
      this.add.rectangle(112, 256, 64, 64, 0x000000, 0),
    ]
    for (const zone of houseCollisionZones) {
      this.physics.add.existing(zone, true)
      this.physics.add.collider(this.player, zone)
    }

    const keyboard = this.input.keyboard!
    this.wasdKeys = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as DirectionalKeys
    this.arrowKeys = keyboard.createCursorKeys()

    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight)
    this.cameras.main.setRoundPixels(true)
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
    const fitCameraToViewport = () => {
      const viewportWidth = Math.max(1, this.scale.width)
      const viewportHeight = Math.max(1, this.scale.height)
      const coverZoom = Math.max(viewportWidth / worldWidth, viewportHeight / worldHeight)
      this.cameras.main.setZoom(coverZoom)
    }
    fitCameraToViewport()
    this.scale.on(Phaser.Scale.Events.RESIZE, fitCameraToViewport)
    this.playerNameTag = new NameTag(NAME_TAG_STYLE.hero, { clampToView: true })
    void this.playerNameTag.create(this, this.player, getPlayerProfile().name)

    this.createGateHint()
    this.setupNpcs()
    this.setupInteraction()
    this.time.addEvent({
      delay: 2000,
      loop: true,
      callback: () => this.saveProgress(),
    })
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.saveProgress())
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, fitCameraToViewport)
      this.destroyGateHint()
      this.destroyLayerPreview()
    })
    this.devOpenChallenge()

    if (import.meta.env.DEV) {
      const report = new GameAutoTester(
        this,
        this.map,
        this.groundLayer,
        [this.obstaclesLayer],
        this.foregroundLayer,
        this.player,
      ).runFullDiagnostics(50)
      // Publish the report so it can be read back from the console (or by the
      // headless auto-tester) instead of only being printed. Guarded by DEV so
      // it is stripped from production builds.
      ;(globalThis as unknown as { __dsaDiagnostics?: unknown }).__dsaDiagnostics = report
    }
  }

  /**
   * Copies decorative overhangs onto the above-player layer.
   *
   * Upper tree, roof, fence, boulder, statue and cave-arch art is painted on
   * the obstacle layer. Left there it draws under the player, who appears to
   * walk over the structure instead of passing behind its upper portion.
   *
   * The tile is *duplicated* onto `2_AbovePlayer` rather than moved: the copy
   * is purely visual. The original keeps collision only when its GID represents
   * a base, trunk, fence rail or other solid tile; `setupObstacleCollisions()`
   * clears it only on the explicitly listed roof/canopy/upper-structure GIDs.
   */
  private duplicateAbovePlayerTiles() {
    const width = this.obstaclesLayer.layer.width
    const height = this.obstaclesLayer.layer.height

    for (let tileY = 0; tileY < height; tileY += 1) {
      for (let tileX = 0; tileX < width; tileX += 1) {
        const source = this.obstaclesLayer.getTileAt(tileX, tileY)
        if (
          !source ||
          source.index === -1 ||
          // Force-solid cells are never drawn over the player.
          VILLAGE_FORCE_SOLID_CELLS.has(`${tileX},${tileY}`) ||
          !(
            ABOVE_PLAYER_TILE_IDS.has(source.index) ||
            VILLAGE_PILLAR_OVERHANGS.has(`${tileX},${tileY}`) ||
            VILLAGE_FENCE_OVERLAY_CELLS.has(`${tileX},${tileY}`) ||
            this.westHouseForegroundTiles.has(`${tileX},${tileY}`)
          )
        ) {
          continue
        }
        const authoredOverlay = this.foregroundLayer.getTileAt(tileX, tileY)
        if (authoredOverlay && authoredOverlay.index !== -1) {
          continue
        }
        const copy = this.foregroundLayer.putTileAt(source.index, tileX, tileY, false)
        // Belt and braces: nothing on this layer may ever collide.
        copy.setCollision(false, false, false, false, false)
      }
    }
  }

  /** Draw the wall's upper timber row above the player, like building canopies. */
  private duplicateWoodenWallTopTiles() {
    const width = this.groundLayer.layer.width
    const height = this.groundLayer.layer.height

    for (let tileY = 0; tileY < height; tileY += 1) {
      for (let tileX = 0; tileX < width; tileX += 1) {
        const source = this.groundLayer.getTileAt(tileX, tileY)
        if (!source || !WOODEN_WALL_TOP_TILE_IDS.has(source.index)) {
          continue
        }
        const authoredOverlay = this.foregroundLayer.getTileAt(tileX, tileY)
        if (authoredOverlay && authoredOverlay.index !== -1) {
          continue
        }
        const copy = this.foregroundLayer.putTileAt(source.index, tileX, tileY, false)
        copy.setCollision(false, false, false, false, false)
      }
    }
  }

  /** Toggle a non-invasive color overlay for map-layer and collision debugging. */
  setLayerPreview(enabled: boolean) {
    this.layerPreviewEnabled = enabled
    if (!enabled) {
      this.destroyLayerPreview()
      return
    }

    if (!this.layerPreviewGraphics) {
      this.layerPreviewGraphics = this.add.graphics().setDepth(2000)
    }
    if (!this.layerPreviewLegend) {
      this.layerPreviewLegend = this.add.text(
        14,
        14,
        'LAYER PREVIEW\nRED = obstacle collision\nBLUE = ground collision\nPURPLE = above-player art\nORANGE = walkable obstacle art',
        {
          color: '#fff7df',
          backgroundColor: '#111827dd',
          fontFamily: 'monospace',
          fontSize: '13px',
          padding: { left: 8, right: 8, top: 6, bottom: 6 },
          lineSpacing: 4,
        },
      ).setScrollFactor(0).setDepth(2001)
    }
    this.refreshLayerPreview()
  }

  private refreshLayerPreview() {
    const graphics = this.layerPreviewGraphics
    if (!graphics || !this.layerPreviewEnabled) {
      return
    }

    graphics.clear()
    const tileWidth = this.map.tileWidth
    const tileHeight = this.map.tileHeight
    for (let tileY = 0; tileY < this.map.height; tileY += 1) {
      for (let tileX = 0; tileX < this.map.width; tileX += 1) {
        const x = tileX * tileWidth
        const y = tileY * tileHeight
        const ground = this.groundLayer.getTileAt(tileX, tileY)
        const obstacle = this.obstaclesLayer.getTileAt(tileX, tileY)
        const foreground = this.foregroundLayer.getTileAt(tileX, tileY)

        if (ground?.collides) {
          graphics.fillStyle(0x2563eb, 0.32).fillRect(x, y, tileWidth, tileHeight)
        }
        if (obstacle && obstacle.index !== -1) {
          if (obstacle.collides) {
            graphics.fillStyle(0xdc2626, 0.36).fillRect(x, y, tileWidth, tileHeight)
          } else {
            graphics.lineStyle(1, 0xf59e0b, 0.9).strokeRect(x + 1, y + 1, tileWidth - 2, tileHeight - 2)
          }
        }
        if (foreground && foreground.index !== -1) {
          graphics.fillStyle(0xa855f7, 0.3).fillRect(x, y, tileWidth, tileHeight)
        }
      }
    }
  }

  private destroyLayerPreview() {
    this.layerPreviewGraphics?.destroy()
    this.layerPreviewLegend?.destroy()
    this.layerPreviewGraphics = null
    this.layerPreviewLegend = null
  }

  /** Apply the annotated red/blue/green collision plan to the west house only. */
  private applyWestHouseCellRules() {
    this.westHouseForegroundTiles.clear()

    for (let tileY = 14; tileY <= 19; tileY += 1) {
      for (let tileX = 0; tileX <= 9; tileX += 1) {
        const key = `${tileX},${tileY}`
        const tile = this.obstaclesLayer.getTileAt(tileX, tileY)
        if (!tile || tile.index === -1) {
          continue
        }

        if (WEST_HOUSE_OPEN_CELLS.has(key)) {
          tile.setCollision(false, false, false, false, false)
        } else {
          tile.setCollision(true, true, true, true)
        }

        if (WEST_HOUSE_FOREGROUND_CELLS.has(key)) {
          this.westHouseForegroundTiles.add(key)
        }
      }
    }
  }

  /**
   * Seals or opens the torii gate threshold.
   *
   * Locking forces collision on every tile inside the gate rectangle, which
   * turns the threshold back into an ordinary wall. Unlocking does the reverse,
   * clearing collision on those cells that carry a walkable passage tile.
   */
  private applyGateLock() {
    for (let tileY = TORII_GATE_LOCK.minY; tileY <= TORII_GATE_LOCK.maxY; tileY += 1) {
      for (let tileX = TORII_GATE_LOCK.minX; tileX <= TORII_GATE_LOCK.maxX; tileX += 1) {
        const tile = this.obstaclesLayer.getTileAt(tileX, tileY)
        if (!tile || tile.index === -1) {
          continue
        }
        if (this.isGateLocked) {
          tile.setCollision(true, true, true, true)
        } else if (isWalkableTile(tile.index)) {
          tile.setCollision(false, false, false, false, false)
        }
      }
    }
  }

  /** Opens the gate. Called when the challenge is solved. */
  unlockGate() {
    if (!this.isGateLocked) {
      return
    }
    this.isGateLocked = false
    this.hideGateHint(true)
    this.applyGateLock()
    this.refreshLayerPreview()
  }

  /**
   * TEMPORARY testing aid: override the torii gate for the current runtime only.
   * Does not update quest progress or saved data. Turning the override off
   * returns to the actual quest completion state.
   */
  setGateOpenForTesting(open: boolean) {
    this.isGateLocked = open ? false : !QuestManager.isCompleted('array-sorting-challenge')
    if (!this.isGateLocked) {
      this.hideGateHint(true)
    }
    this.applyGateLock()
    this.refreshLayerPreview()
  }

  private createGateHint() {
    // Phaser camera zoom also scales scroll-factor-0 display objects. A fixed DOM
    // overlay avoids camera/world coordinates entirely while keeping the hint in
    // the same visual language as the existing HUD.
    const element = document.createElement('div')
    element.textContent = GATE_HINT_MESSAGE
    element.setAttribute('role', 'status')
    element.setAttribute('aria-live', 'polite')
    element.style.position = 'fixed'
    element.style.left = '50%'
    element.style.bottom = '12%'
    element.style.transform = 'translateX(-50%)'
    element.style.zIndex = '350'
    element.style.pointerEvents = 'none'
    element.style.boxSizing = 'border-box'
    element.style.maxWidth = 'min(560px, calc(100vw - 96px))'
    element.style.padding = '10px 16px'
    element.style.border = '2px solid #8f6038'
    element.style.borderRadius = '7px'
    element.style.background = 'rgba(244, 232, 206, 0.97)'
    element.style.boxShadow = '0 3px 12px rgba(15, 23, 42, 0.45)'
    element.style.color = '#211b16'
    element.style.font = '700 16px/1.35 "Courier New", ui-monospace, monospace'
    element.style.textAlign = 'center'
    element.style.opacity = '0'
    element.style.visibility = 'hidden'
    element.style.transition = 'opacity 180ms ease-out'
    document.body.appendChild(element)
    this.gateHintElement = element
  }

  private updateGateHint() {
    const gateClosed = this.isGateLocked
    const blockedByUi = this.isDialogueOpen || this.isChallengeOpen
    const playerTileX = this.player.x / this.map.tileWidth
    const playerTileY = this.player.y / this.map.tileHeight
    const inGateZone =
      playerTileX >= GATE_HINT_ZONE.minX &&
      playerTileX <= GATE_HINT_ZONE.maxX &&
      playerTileY >= GATE_HINT_ZONE.minY &&
      playerTileY <= GATE_HINT_ZONE.maxY

    if (!gateClosed || blockedByUi) {
      this.gateHintZoneActive = false
      this.hideGateHint(true)
      return
    }

    if (!inGateZone) {
      this.gateHintZoneActive = false
      this.hideGateHint()
      return
    }

    if (this.gateHintZoneActive || this.time.now < this.gateHintCooldownUntil) {
      return
    }

    this.gateHintZoneActive = true
    console.debug('[DSA Quest] Closed-gate hint trigger reached', {
      playerTileX,
      playerTileY,
      gateClosed,
      dialogueOpen: this.isDialogueOpen,
      challengeOpen: this.isChallengeOpen,
    })
    this.showGateHint()
  }

  private showGateHint() {
    const element = this.gateHintElement
    if (!element) {
      return
    }
    this.gateHintVisibleUntil = this.time.now + GATE_HINT_VISIBLE_MS
    this.gateHintCooldownUntil = this.time.now + GATE_HINT_COOLDOWN_MS
    element.style.visibility = 'visible'
    element.style.opacity = '1'
  }

  private hideGateHint(immediate = false) {
    const element = this.gateHintElement
    if (!element) {
      return
    }
    if (immediate) {
      element.style.transition = 'none'
      element.style.opacity = '0'
      element.style.visibility = 'hidden'
      element.offsetHeight
      element.style.transition = 'opacity 180ms ease-out'
      return
    }
    if (this.time.now < this.gateHintVisibleUntil) {
      return
    }
    element.style.opacity = '0'
    element.style.visibility = 'hidden'
  }

  private destroyGateHint() {
    this.gateHintElement?.remove()
    this.gateHintElement = null
  }

  /** Only pond water and the middle wooden wall are solid; snow/dirt stays open. */
  private setupLakeCollision() {
    const lakeTileIds = new Set([68, 124])

    for (let tileY = 0; tileY < this.map.height; tileY += 1) {
      for (let tileX = 0; tileX < this.map.width; tileX += 1) {
        const tile = this.groundLayer.getTileAt(tileX, tileY)
        if (!tile) {
          continue
        }

        const solid = lakeTileIds.has(tile.index) || WOODEN_WALL_TILE_IDS.has(tile.index)
        tile.setCollision(solid, solid, solid, solid)
      }
    }
  }

  /**
   * Non-empty obstacle tiles are solid by default. Only explicit walkable
   * surfaces and explicitly identified overhang art are non-solid. This avoids
   * turning complete village walls/fences/pillars into invisible passages.
   */
  private setupObstacleCollisions() {
    this.obstaclesLayer.setCollisionByExclusion([-1])

    for (let tileY = 0; tileY < this.obstaclesLayer.layer.height; tileY += 1) {
      for (let tileX = 0; tileX < this.obstaclesLayer.layer.width; tileX += 1) {
        const tile = this.obstaclesLayer.getTileAt(tileX, tileY)
        if (!tile || tile.index === -1) {
          continue
        }

        // Force-solid cells always collide, beating the overhang, walk-behind
        // and tile-ID rules for those cells only (see villageRegionRules.ts).
        const forceSolid = VILLAGE_FORCE_SOLID_CELLS.has(`${tileX},${tileY}`)
        const isNonColliding =
          !forceSolid &&
          (isWalkableTile(tile.index) ||
            NON_SOLID_OVERHANG_TILE_IDS.has(tile.index) ||
            VILLAGE_PILLAR_OVERHANGS.has(`${tileX},${tileY}`))
        const solid = !isNonColliding
        tile.setCollision(solid, solid, solid, solid)
      }
    }
  }

  private createHunterAnimations() {
    const directions: FacingDirection[] = ['down', 'up', 'left', 'right']

    for (const direction of directions) {
      const column = directionColumns[direction]
      const walkFrames = Array.from(
        { length: walkFrameCountPerDirection },
        (_, row) => ({ key: 'hunter-walk', frame: row * 4 + column }),
      )
      const walkKey = `walk-${direction}`
      if (!this.anims.exists(walkKey)) {
        this.anims.create({
          key: walkKey,
          frames: walkFrames,
          frameRate: hunterAnimationFrameRate,
          repeat: -1,
        })
      }
    }
  }

  /**
   * Idle animations for the Elder.
   *
   * `Elder/Idle.png` is a single row of four 16x16 cells in the same
   * down/up/left/right order as the Hunter's sheets, so one idle frame per
   * direction is all that is needed. A single repeating frame at 1fps is
   * intentional: the art has no idle cycle, and this keeps the key stable for
   * `Npc`, which plays `idle-<direction>`.
   */
  private createElderAnimations() {
    const directions: FacingDirection[] = ['down', 'up', 'left', 'right']

    if (!this.anims.exists('elder-thought-bubble')) {
      this.anims.create({
        key: 'elder-thought-bubble',
        frames: this.anims.generateFrameNumbers('ui-dialog-info', { start: 0, end: 3 }),
        frameRate: 2.5,
        repeat: -1,
      })
    }

    for (const [index, direction] of directions.entries()) {
      const idleKey = `elder-anim-idle-${direction}`
      if (this.anims.exists(idleKey)) {
        continue
      }
      this.anims.create({
        key: idleKey,
        frames: this.anims.generateFrameNumbers('elder-idle', { start: index, end: index }),
        frameRate: 1,
        repeat: -1,
      })
    }

    // Walk cycle: four frames per direction, laid out row-major so direction
    // `d` at index `i` starts at row `i`.
    if (this.textures.exists('elder-walk')) {
      for (const [index, direction] of directions.entries()) {
        const walkKey = `elder-anim-walk-${direction}`
        if (this.anims.exists(walkKey)) {
          continue
        }
        this.anims.create({
          key: walkKey,
          frames: this.anims.generateFrameNumbers('elder-walk', {
            start: index * walkFrameCountPerDirection,
            end: index * walkFrameCountPerDirection + walkFrameCountPerDirection - 1,
          }),
          frameRate: 6,
          repeat: -1,
        })
      }
    }
  }

  /**
   * Spawns the village NPCs. Positions come from `VILLAGE_NPCS` in tile
   * coordinates and are converted here using the loaded map's tile size, so the
   * content file never has to hard-code pixel offsets.
   */
  private setupNpcs() {
    this.dialogue = new DialogueController()
    this.interactionPrompt = new InteractionPrompt(this)

    for (const definition of VILLAGE_NPCS) {
      // A tile coordinate is the tile's top-left; the sprite is anchored at its
      // feet, so centre the sprite within the tile vertically.
      const x = (definition.tileX + 0.5) * this.map.tileWidth
      const y = (definition.tileY + 1) * this.map.tileHeight
      const npc = new Npc(this, {
        id: definition.id,
        name: definition.name,
        spriteKey: definition.spriteKey,
        x,
        y,
        tint: definition.tint,
        dialogueTree: definition.dialogueTree,
        idleAnimation: definition.idleAnimation,
        portraitUrl: definition.portraitUrl,
      })
      this.npcs.push(npc)

      const npcNameTag = new NameTag(NAME_TAG_STYLE.npc, {
        clampToView: false,
        proximity: {
          target: this.player,
          showDistance: NPC_TAG_SHOW_DISTANCE,
          hideDistance: NPC_TAG_HIDE_DISTANCE,
          fadeMs: NPC_TAG_FADE_MS,
        },
      })
      this.npcNameTags.set(definition.id, npcNameTag)
      void npcNameTag.create(this, npc.sprite, definition.name)

      if (definition.wander) {
        const walkPrefix = definition.walkAnimationPrefix
        this.wanderAis.set(
          definition.id,
          new WanderAi(definition.wander, {
            canStandAt: (px, py) => this.canStandAt(px, py),
            applyFacing: (direction) => {
              const walkKey = walkPrefix ? `${walkPrefix}-${direction}` : ''
              if (walkKey && this.anims.exists(walkKey)) {
                npc.sprite.play(walkKey, true)
              }
            },
          }),
        )
      }
    }
  }

  /**
   * True when nothing solid occupies this world position.
   *
   * Used by the wandering AI so it never paces into a wall the player cannot
   * enter. Bounds are checked explicitly because the tilemap has no tile outside
   * its own extent.
   */
  private canStandAt(x: number, y: number): boolean {
    const tileX = Math.floor(x / this.map.tileWidth)
    const tileY = Math.floor(y / this.map.tileHeight)
    if (tileX < 0 || tileY < 0 || tileX >= this.map.width || tileY >= this.map.height) {
      return false
    }
    return !this.obstaclesLayer.getTileAt(tileX, tileY)?.collides
  }

  private setupInteraction() {
    const keyboard = this.input.keyboard!
    this.interactKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    this.spaceKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.escapeKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)

    // Keep the browser from scrolling the page when Space is used to talk.
    keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.E,
      Phaser.Input.Keyboard.KeyCodes.ESC,
    ])

    // A latch rather than an edge check.
    //
    // `JustDown` only sees a press that is still held on an update tick, so a
    // quick tap whose keyup lands before the next tick is dropped entirely.
    // The DOM listener records the press the moment it happens, and `update`
    // consumes and clears it, so no press can be lost no matter how the
    // keydown/keyup pair straddles a frame boundary.
    this.interactPressedLatch = false
    window.addEventListener('keydown', this.handleInteractionKeyDown)
  }

  setTouchDirection(direction: TouchDirection, isDown: boolean) {
    this.touchDirections[direction] = isDown
  }

  pressTouchInteract() {
    this.interactPressedLatch = true
  }

  private clearTouchDirections() {
    for (const direction of Object.keys(this.touchDirections) as TouchDirection[]) {
      this.touchDirections[direction] = false
    }
  }

  private saveProgress() {
    if (this.player) {
      QuestManager.save({ x: this.player.x, y: this.player.y })
    }
  }

  setPlayerSpeed(speed: number) {
    this.playerSpeed = Phaser.Math.Clamp(speed, PLAYER_SPEED_MIN, PLAYER_SPEED_MAX)
    try {
      localStorage.setItem(PLAYER_SPEED_KEY, String(this.playerSpeed))
    } catch {
      // Settings still apply for the current session if storage is unavailable.
    }
  }

  pauseGame() {
    this.clearTouchDirections()
    this.scene.pause()
  }

  resumeGame() {
    this.scene.resume()
  }

  saveGame() {
    this.saveProgress()
  }

  attachMultiplayerRoom(room: MultiplayerRoom | null): void {
    this.unsubscribeGameState?.()
    this.unsubscribeGameState = null
    this.multiplayerRoom = room
    if (!room) return
    this.unsubscribeGameState = room.onGameState((state) => this.applyRemotePlayerState(state))
  }

  private applyRemotePlayerState(state: MultiplayerGameState): void {
    let remote = this.remotePlayers.get(state.playerId)
    if (!remote) {
      const sprite = this.add.sprite(state.x, state.y, 'hunter-idle', directionColumns[state.direction])
        .setDepth(CHARACTER_DEPTH_BASE + state.y)
      const label = this.add.text(state.x, state.y - 17, state.name, {
        fontFamily: 'monospace', fontSize: '9px', color: '#ffffff',
        backgroundColor: '#101722cc', padding: { x: 3, y: 2 },
      }).setOrigin(0.5, 1).setDepth(CHARACTER_DEPTH_BASE + state.y + 1)
      remote = { sprite, label, targetX: state.x, targetY: state.y, direction: state.direction, moving: state.moving }
      this.remotePlayers.set(state.playerId, remote)
    }
    remote.targetX = state.x
    remote.targetY = state.y
    remote.direction = state.direction
    remote.moving = state.moving
    remote.label.setText(state.name)
    if (state.moving) remote.sprite.play(`walk-${state.direction}`, true)
    else { remote.sprite.anims.stop(); remote.sprite.setTexture('hunter-idle', directionColumns[state.direction]) }
  }

  private updateMultiplayer(): void {
    for (const remote of this.remotePlayers.values()) {
      remote.sprite.x = Phaser.Math.Linear(remote.sprite.x, remote.targetX, 0.35)
      remote.sprite.y = Phaser.Math.Linear(remote.sprite.y, remote.targetY, 0.35)
      remote.sprite.setDepth(Math.max(MAP_LAYER_DEPTHS.ground + 1, CHARACTER_DEPTH_BASE + remote.sprite.y))
      remote.label.setPosition(remote.sprite.x, remote.sprite.y - 17).setDepth(remote.sprite.depth + 1)
    }
    if (!this.multiplayerRoom) return
    const now = this.time.now
    if (now - this.lastNetworkSendAt < 80) return
    this.lastNetworkSendAt = now
    this.multiplayerRoom.sendGameState({ x: this.player.x, y: this.player.y, direction: this.facingDirection, moving: this.isMoving })
  }

  update() {
    // The dialogue may have ended on its own (a terminal node closes it), so
    // the scene's own flag is resynced from the controller before anything
    // decides whether the player is frozen. Without this the player stays
    // locked in place after the last line of a conversation.
    if (this.isDialogueOpen && !this.dialogue.isOpen) {
      this.releasePlayer()
    }

    this.updateWanderAis()
    this.updateNpcs()

    if (this.isDialogueOpen) {
      this.handleOpenDialogueInput()
    } else {
      this.handleInteractionInput()
    }

    this.updateGateHint()
    this.updatePlayerMovement()
    if (this.isMoving && !this.isDialogueOpen && !this.isChallengeOpen) playFootstep(this.time.now)
    this.updateMultiplayer()
    const showNameTags = !this.isDialogueOpen && !this.isChallengeOpen
    this.playerNameTag?.setVisible(showNameTags)
    this.playerNameTag?.update()
    for (const tag of this.npcNameTags.values()) {
      tag.setVisible(showNameTags)
      tag.update()
    }
  }

  /** Keeps every NPC Y-sorted and manages the proximity prompt. */
  private updateNpcs() {
    for (const npc of this.npcs) {
      npc.update()
      npc.setThoughtBubbleVisible(
        !this.isDialogueOpen && npc.isInRange(this.player.x, this.player.y),
      )
    }
    if (this.isDialogueOpen) {
      this.interactionPrompt.hide()
      return
    }
    const nearbyNpc = isNpcNearby(this.npcs, this.player.x, this.player.y)
    this.interactionPrompt.showFor(nearbyNpc)
  }

  /**
   * Drives wandering NPCs and syncs their animation.
   *
   * Wandering is suspended for whichever NPC is being talked to, so the Elder
   * stops moving the moment the box opens and resumes afterwards.
   */
  private updateWanderAis() {
    const talkingTo = this.dialogue.activeNpc?.id ?? null

    for (const npc of this.npcs) {
      const ai = this.wanderAis.get(npc.id)
      if (!ai) {
        continue
      }
      const paused = npc.id === talkingTo
      const playerNear = npc.isInRange(this.player.x, this.player.y)
      const held = paused || playerNear
      // Suspend movement both while talking and merely standing in range, so
      // the Elder does not amble away from the player mid-reach.
      ai.update(npc, this.game.loop.delta, this.time.now, held)

      const facing = ai.heading
      const idleKey = `elder-anim-idle-${facing}`
      const walkKey = `elder-anim-walk-${facing}`
      const targetKey = ai.walking && !held ? walkKey : idleKey

      // Turn to face the player while talking, otherwise hold the current facing.
      if (paused) {
        npc.faceTowards(this.player.x, this.player.y)
      } else if (this.anims.exists(targetKey) && npc.sprite.anims.currentAnim?.key !== targetKey) {
        npc.sprite.play(targetKey, true)
      }
    }
  }

  private handleInteractionInput() {
    if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
      this.saveProgress()
      this.onRequestExit?.()
      return
    }
    if (!this.isInteractJustPressed()) {
      return
    }
    const npc = isNpcNearby(this.npcs, this.player.x, this.player.y)
    if (npc) {
      this.beginDialogue(npc)
    }
  }

  /**
   * Starts a conversation, routing the Elder to the right opening line.
   *
   * Once the quest has been handed over he should acknowledge the completion
   * rather than offering it again, and the arrays branch should not re-offer the
   * challenge if it has already been solved.
   */
  private beginDialogue(npc: Npc) {
    // Talking to the Elder *is* the first quest's objective, so reaching him
    // completes it. Doing this on open rather than on reaching a particular node
    // means the player cannot get stuck with Quest 1 permanently active, which
    // would leave Quest 2 locked forever.
    if (npc.id === 'elder-masanori') {
      QuestManager.completeQuest('speak-with-elder')
    }

    // Once the challenge is solved the Elder acknowledges it instead of
    // offering it again.
    const opening = QuestManager.isCompleted('array-sorting-challenge') ? 'quest_done' : null
    if (opening) {
      this.dialogue.startAt(npc, opening)
    } else {
      this.dialogue.start(npc)
    }

    this.isDialogueOpen = true
    this.interactionPrompt.hide()
  }

  /**
   * While the box is open the scene consumes E/Space itself so that the
   * player cannot move, and so there is a single owner of the open/close
   * transition. The React overlay listens for the same keys to advance nodes.
   */
  private handleOpenDialogueInput() {
    if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
      this.closeDialogue()
      return
    }

    const movementPressed =
      Phaser.Input.Keyboard.JustDown(this.wasdKeys.up) ||
      Phaser.Input.Keyboard.JustDown(this.wasdKeys.down) ||
      Phaser.Input.Keyboard.JustDown(this.wasdKeys.left) ||
      Phaser.Input.Keyboard.JustDown(this.wasdKeys.right) ||
      Phaser.Input.Keyboard.JustDown(this.arrowKeys.up) ||
      Phaser.Input.Keyboard.JustDown(this.arrowKeys.down) ||
      Phaser.Input.Keyboard.JustDown(this.arrowKeys.left) ||
      Phaser.Input.Keyboard.JustDown(this.arrowKeys.right)
    if (movementPressed) {
      this.closeDialogue()
      return
    }

    if (this.isInteractJustPressed() && this.dialogue.tryAdvance(this.time.now)) {
      return
    }
  }

  /**
   * True once per physical press of E or Space.
   *
   * Reads and immediately clears the latch, so a single tap produces exactly
   * one `true` across the frames that follow it.
   */
  private isInteractJustPressed(): boolean {
    if (this.interactPressedLatch) {
      this.interactPressedLatch = false
      return true
    }
    // Fallback for presses Phaser's own capture reports but the DOM missed.
    return (
      Phaser.Input.Keyboard.JustDown(this.interactKey) ||
      Phaser.Input.Keyboard.JustDown(this.spaceKey)
    )
  }

  private updatePlayerMovement() {
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body

    // A conversation freezes the player: zero velocity, and no animation change
    // so the sprite holds whatever frame it was on. The challenge modal is a
    // full-screen React surface, so it freezes movement for the same reason.
    if (this.isDialogueOpen || this.isChallengeOpen) {
      playerBody.setVelocity(0, 0)
      this.applyPlayerDepth()
      return
    }

    const velocity = new Phaser.Math.Vector2(0, 0)

    if (this.wasdKeys.left.isDown || this.arrowKeys.left.isDown || this.touchDirections.left) {
      velocity.x -= 1
    }
    if (this.wasdKeys.right.isDown || this.arrowKeys.right.isDown || this.touchDirections.right) {
      velocity.x += 1
    }
    if (this.wasdKeys.up.isDown || this.arrowKeys.up.isDown || this.touchDirections.up) {
      velocity.y -= 1
    }
    if (this.wasdKeys.down.isDown || this.arrowKeys.down.isDown || this.touchDirections.down) {
      velocity.y += 1
    }

    if (velocity.y < 0) {
      this.facingDirection = 'up'
    } else if (velocity.y > 0) {
      this.facingDirection = 'down'
    } else if (velocity.x < 0) {
      this.facingDirection = 'left'
    } else if (velocity.x > 0) {
      this.facingDirection = 'right'
    }

    const moving = velocity.lengthSq() > 0
    if (velocity.lengthSq() > 0) {
      velocity.normalize().scale(this.playerSpeed)
    }

    if (moving !== this.isMoving || moving && this.player.anims.currentAnim?.key !== `walk-${this.facingDirection}`) {
      if (moving) {
        this.player.play(`walk-${this.facingDirection}`, true)
      } else {
        this.player.anims.stop()
        this.player.setTexture('hunter-idle', directionColumns[this.facingDirection])
      }
      this.isMoving = moving
    }

    playerBody.setVelocity(velocity.x, velocity.y)
    this.applyPlayerDepth()
  }

  /**
   * Y-sorts the player against the map and the NPC.
   *
   * The depth is derived from the physics body's *feet* rather than the
   * sprite's centre. A character standing below a wall or tree sorts in front
   * of it, and one standing above it sorts behind, which produces realistic
   * partial occlusion when walking past tall geometry.
   *
   * The value sits in the same range as the tilemap layers (obstacles at 10,
   * foreground at 1000), so a small bias keeps the player above the obstacle
   * layer while still ordering against sprites sorted by the same Y.
   */
  private applyPlayerDepth(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body
    // Never let the player fall below the ground layer, while the dedicated
    // above-player layer can still occlude the sprite under tree/roof canopies.
    this.player.setDepth(Math.max(MAP_LAYER_DEPTHS.ground + 1, CHARACTER_DEPTH_BASE + body.bottom))
  }

  /** Screen position of an NPC's head, relative to the React game-world overlay. */
  getDialogueAnchorPosition(npcId: string): { x: number; y: number } | null {
    const npc = this.npcs.find((candidate) => candidate.id === npcId)
    const canvas = this.game.canvas
    const worldElement = canvas.parentElement?.parentElement
    if (!npc || !worldElement || !canvas.isConnected) {
      return null
    }

    const camera = this.cameras.main
    const canvasBounds = canvas.getBoundingClientRect()
    const worldBounds = worldElement.getBoundingClientRect()
    const scaleX = canvasBounds.width / this.scale.gameSize.width
    const scaleY = canvasBounds.height / this.scale.gameSize.height
    const headY = npc.sprite.y - npc.sprite.displayHeight - 8

    return {
      x:
        canvasBounds.left -
        worldBounds.left -
        worldElement.clientLeft +
        (camera.x + (npc.sprite.x - camera.worldView.x) * camera.zoom) * scaleX,
      y:
        canvasBounds.top -
        worldBounds.top -
        worldElement.clientTop +
        (camera.y + (headY - camera.worldView.y) * camera.zoom) * scaleY,
    }
  }

  /**
   * Called by the React overlay when the conversation ends, so the scene and
   * the UI never disagree about whether the box is open.
   */
  closeDialogue() {
    this.dialogue.close()
    this.releasePlayer()
  }

  /**
   * Hands control back to the player.
   *
   * Called on every path out of a conversation - the overlay closing the box and
   * the controller ending on a terminal node alike - so the player can never be
   * left frozen. The body is explicitly re-enabled and given zero velocity,
   * which clears anything left over from the frozen frames; the keyboard plugin
   * itself is never disabled, so a held movement key resumes on the next tick.
   */
  private releasePlayer() {
    this.isDialogueOpen = false

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body
    playerBody.enable = true
    playerBody.setVelocity(0, 0)
    playerBody.setAllowGravity(false)
    playerBody.setCollideWorldBounds(true)

    // Drop the interact latch so the key press that closed the conversation does
    // not immediately re-open it now that the player is free again.
    this.interactPressedLatch = false
  }

  /** Forwards a branch choice from the overlay into the dialogue tree. */
  chooseDialogueNode(nextNodeId: string) {
    this.dialogue.choose(nextNodeId)
    this.runDialogueEffects(nextNodeId)
  }

  /**
   * World side effects for specific dialogue nodes.
   *
   * Kept out of the dialogue data so the content file stays pure: the tree
   * declares *what* the Elder says, the scene decides what it *does*.
   */
  private runDialogueEffects(nodeId: string) {
    if (nodeId === 'quest_accept') {
      QuestManager.startQuest('array-sorting-challenge')
      this.openChallenge()
    }
  }

  /**
   * Advances a linear node from the overlay.
   *
   * The controller ignores the input while the cooldown is active, so the
   * overlay can fire this on every Enter/Space without the scene and the UI
   * each applying their own debounce.
   */
  advanceDialogue() {
    playVoiceCue()
    if (this.dialogue.tryAdvance(this.time.now)) {
      return
    }
  }

  /** Opens the array quiz and freezes the player behind it. */
  openChallenge() {
    // Close the dialogue first: the modal is a full-screen surface and must not
    // be stacked on top of the dialogue box.
    this.closeDialogue()
    challengeStore.openChallenge('array-quiz', getRandomArrayStackTarget())
  }

  /**
   * Dev-only shortcut to the challenge, for testing the modal in isolation.
   *
   * It reproduces the real sequence - talking to the Elder completes Quest 1,
   * and accepting his quest opens the challenge - so the prerequisite chain is
   * exercised rather than bypassed. Exposed as a DOM event because headless
   * tooling cannot see page globals.
   */
  devOpenChallenge() {
    if (!import.meta.env.DEV) {
      return
    }
    window.addEventListener('dsa:open-challenge', () => {
      QuestManager.completeQuest('speak-with-elder')
      QuestManager.startQuest('array-sorting-challenge')
      this.openChallenge()
    })
  }

  private pausePlayerForChallenge() {
    this.isChallengeOpen = true
    this.interactPressedLatch = false
    if (this.input.keyboard) {
      this.input.keyboard.enabled = false
    }
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body
    playerBody.setVelocity(0, 0)
  }

  private resumePlayerAfterChallenge(completedSuccessfully: boolean) {
    if (this.input.keyboard) {
      this.input.keyboard.enabled = true
    }
    this.isChallengeOpen = false
    this.releasePlayer()
    if (completedSuccessfully) {
      this.completeChallenge()
    }
  }

  /**
   * Called when the challenge is solved: completes the quest and opens the gate.
   *
   * The quest is started first so completion is idempotent. Solving the challenge
   * is proof of completion, so it must not be silently dropped just because the
   * quest was still `locked` (for example if the modal was reached another way).
   */
  completeChallenge() {
    QuestManager.startQuest('array-sorting-challenge')
    if (QuestManager.completeQuest('array-sorting-challenge')) {
      QuestManager.awardXp(50)
    }
    this.unlockGate()
  }

  /** Whether a conversation is currently open; the overlay uses this on mount. */
  get isTalking(): boolean {
    return this.isDialogueOpen
  }
}
