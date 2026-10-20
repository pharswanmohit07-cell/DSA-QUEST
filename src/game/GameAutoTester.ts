import Phaser from 'phaser'
import {
  ABOVE_PLAYER_TILE_GROUPS,
  ABOVE_PLAYER_TILE_IDS,
  NON_SOLID_OVERHANG_TILE_IDS,
} from './map/abovePlayerTileIds'
import { isWalkableTile, WALKABLE_TILE_ID_GROUPS } from './map/walkableTileIds'
import { TORII_GATE_LOCK, isInsideGateLock } from './map/gateLock'

export type PassageGroupReport = {
  name: string
  tileIds: number[]
  tilesFound: number
  openTiles: number
}

export type OcclusionGroupReport = {
  name: string
  tilesFound: number
  copiesFound: number
  solidSources: number
  openSources: number
}

export type GameDiagnosticsReport = {
  errors: string[]
  warnings: string[]
  occlusion: {
    groups: OcclusionGroupReport[]
    totalTilesFound: number
  }
  passages: {
    groups: PassageGroupReport[]
    totalTilesFound: number
  }
  reachability: {
    spawnTile: { x: number; y: number }
    reachableTiles: number
    walkableTiles: number
    desertCaveArchwayReachable: boolean
  }
  movement: {
    steps: number
    blocked: number
    completed: number
  }
  physics: {
    worldBoundsMatchMap: boolean
    playerCollidesWithWorldBounds: boolean
    dungeonObstacleTilesChecked: number
    desertBoulderTilesChecked: number
  }
}

/**
 * Number of tiles reachable from the spawn when passages and desert pebble
 * tracks are correctly exempted from collision.
 *
 * This baseline includes the walkable snowfield ground, ice decorations and
 * transition tile even while the torii gate remains sealed.
 *
 * Update it deliberately when the map or the gate rectangle is reshaped.
 */
const reachableTileBaseline = 322

export class GameAutoTester {
  private readonly errors: string[] = []
  private readonly warnings: string[] = []
  private readonly occlusionGroups: OcclusionGroupReport[] = []
  private readonly scene: Phaser.Scene
  private readonly map: Phaser.Tilemaps.Tilemap
  private readonly groundLayer: Phaser.Tilemaps.TilemapLayer
  private readonly obstacleLayers: Phaser.Tilemaps.TilemapLayer[]
  private readonly foregroundLayer: Phaser.Tilemaps.TilemapLayer
  private readonly player: Phaser.GameObjects.Sprite

  constructor(
    scene: Phaser.Scene,
    map: Phaser.Tilemaps.Tilemap,
    groundLayer: Phaser.Tilemaps.TilemapLayer,
    obstacleLayers: Phaser.Tilemaps.TilemapLayer[],
    foregroundLayer: Phaser.Tilemaps.TilemapLayer,
    player: Phaser.GameObjects.Sprite,
  ) {
    this.scene = scene
    this.map = map
    this.groundLayer = groundLayer
    this.obstacleLayers = obstacleLayers
    this.foregroundLayer = foregroundLayer
    this.player = player
  }

  runFullDiagnostics(steps = 50): GameDiagnosticsReport {
    console.info('%c Starting automated game diagnostics', 'color: #00ff00; font-weight: bold;')
    this.checkTileDataIntegrity()
    this.checkGroundCollision()
    this.checkSolidObstacles()
    this.checkAbovePlayerCopies()
    const physics = this.checkDungeonPhysics()
    const passages = this.checkWalkablePassages()
    const reachability = this.checkReachability()
    this.checkPlayerBoundaryCollision()
    const movement = this.runRandomMovementStressTest(steps)

    const report: GameDiagnosticsReport = {
      errors: [...this.errors],
      warnings: [...this.warnings],
      occlusion: {
        groups: [...this.occlusionGroups],
        totalTilesFound: this.occlusionGroups.reduce(
          (total, group) => total + group.tilesFound,
          0,
        ),
      },
      passages,
      reachability,
      movement,
      physics,
    }

    if (report.errors.length === 0 && report.warnings.length === 0) {
      console.info('%c Diagnostics passed', 'color: #00ff00;')
    } else {
      console.info('%c Diagnostics found issues', 'color: #ffcc00; font-weight: bold;')
    }
    // Always log the full report so the movement and reachability figures are
    // visible even on a clean run.
    console.info('Diagnostics report:', report)

    return report
  }

  private checkAbovePlayerCopies() {
    this.occlusionGroups.length = 0
    if (this.foregroundLayer.depth !== 1000) {
      this.errors.push(
        `Above-player layer depth is ${this.foregroundLayer.depth}; expected 1000.`,
      )
    }
    const obstacles = this.obstacleLayers.find((layer) => layer.layer.name === '1_Obstacles')
    if (!obstacles) {
      this.errors.push("Obstacle layer '1_Obstacles' is missing while checking above-player copies.")
      return
    }

    for (const group of ABOVE_PLAYER_TILE_GROUPS) {
      const groupIds = new Set(group.tileIds)
      const categoryReport: OcclusionGroupReport = {
        name: group.name,
        tilesFound: 0,
        copiesFound: 0,
        solidSources: 0,
        openSources: 0,
      }
      for (let tileY = 0; tileY < obstacles.layer.height; tileY += 1) {
        for (let tileX = 0; tileX < obstacles.layer.width; tileX += 1) {
          const source = obstacles.getTileAt(tileX, tileY)
          if (!source || !groupIds.has(source.index)) {
            continue
          }
          categoryReport.tilesFound += 1
          if (source.collides) {
            categoryReport.solidSources += 1
          } else {
            categoryReport.openSources += 1
          }
          const copy = this.foregroundLayer.getTileAt(tileX, tileY)
          if (copy && ABOVE_PLAYER_TILE_IDS.has(copy.index) && !copy.collides) {
            categoryReport.copiesFound += 1
          }
        }
      }
      if (categoryReport.copiesFound !== categoryReport.tilesFound) {
        this.errors.push(
          `Occlusion category '${group.name}' has ${categoryReport.copiesFound}/${categoryReport.tilesFound} foreground copies.`,
        )
      }
      if (group.name === 'fence top' && categoryReport.openSources > 0) {
        this.errors.push(
          `Fence category has ${categoryReport.openSources} non-solid source tiles; fence rails must remain solid.`,
        )
      }
      this.occlusionGroups.push(categoryReport)
      console.info('Occlusion category report:', categoryReport)
    }

    for (let tileY = 0; tileY < obstacles.layer.height; tileY += 1) {
      for (let tileX = 0; tileX < obstacles.layer.width; tileX += 1) {
        const source = obstacles.getTileAt(tileX, tileY)
        if (!source || !ABOVE_PLAYER_TILE_IDS.has(source.index)) {
          continue
        }
        const copy = this.foregroundLayer.getTileAt(tileX, tileY)
        const isIntentionalOverlay =
          !!copy && ABOVE_PLAYER_TILE_IDS.has(copy.index) && !copy.collides
        if (!copy || (copy.index !== source.index && !isIntentionalOverlay) || copy.collides) {
          this.errors.push(
            `Above-player copy at (${tileX}, ${tileY}) for GID ${source.index} is missing, mismatched, or collidable.`,
          )
        }
      }
    }

    const pinkTree = [
      [2315, 2316, 2317],
      [2339, 2340, 2341],
      [2363, 2364, 2365],
    ]
    for (const [row, expected] of pinkTree.entries()) {
      for (const [column, gid] of expected.entries()) {
        const tile = obstacles.getTileAt(28 + column, 32 + row)
        if (tile?.index !== gid) {
          this.errors.push(
            `Pink cherry tree tile (${28 + column}, ${32 + row}) should use GID ${gid}.`,
          )
        }
      }
    }

    const smallPinkTreeCanopy = [
      { x: 33, y: 33, gid: 1897 },
      { x: 34, y: 33, gid: 1898 },
    ]
    for (const { x, y, gid } of smallPinkTreeCanopy) {
      const source = obstacles.getTileAt(x, y)
      const copy = this.foregroundLayer.getTileAt(x, y)
      if (source?.index !== gid || copy?.index !== gid || copy.collides) {
        this.errors.push(
          `Small pink cherry tree canopy at (${x}, ${y}) should copy GID ${gid} above the player.`,
        )
      }
    }

    for (let y = 26; y <= 27; y += 1) {
      for (let x = 31; x <= 34; x += 1) {
        const ground = this.groundLayer.getTileAt(x, y)
        const obstacle = obstacles.getTileAt(x, y)
        const foreground = this.foregroundLayer.getTileAt(x, y)
        if (
          ground?.index !== 827 ||
          obstacle?.index !== undefined && obstacle.index !== -1 ||
          foreground?.index !== undefined && foreground.index !== -1
        ) {
          this.errors.push(
            `Removed shed-side tree cell (${x}, ${y}) should be grass GID 827 with no obstacle or foreground tile.`,
          )
        }
      }
    }
    if (obstacles.getTileAt(31, 28)?.index !== 1287) {
      this.errors.push('The mud hut roof at (31, 28) must remain intact after removing the shed-side tree.')
    }

    const whiteSnowTreeCanopy = [
      { x: 9, y: 27, gid: 2321 },
      { x: 10, y: 27, gid: 2322 },
      { x: 11, y: 27, gid: 2323 },
      { x: 9, y: 28, gid: 2345 },
      { x: 10, y: 28, gid: 2346 },
      { x: 11, y: 28, gid: 2347 },
      { x: 9, y: 29, gid: 2369 },
      { x: 11, y: 29, gid: 2371 },
    ]
    for (const { x, y, gid } of whiteSnowTreeCanopy) {
      const source = obstacles.getTileAt(x, y)
      const copy = this.foregroundLayer.getTileAt(x, y)
      if (source?.index !== gid || source.collides || copy?.index !== gid || copy.collides) {
        this.errors.push(`White snow tree canopy at (${x}, ${y}) should duplicate non-colliding GID ${gid}.`)
      }
    }
    const whiteSnowTreeTrunk = obstacles.getTileAt(10, 29)
    if (whiteSnowTreeTrunk?.index !== 2370 || !whiteSnowTreeTrunk.collides) {
      this.errors.push('White snow tree trunk at (10, 29) must remain solid.')
    }

    const snowPillarCap = obstacles.getTileAt(8, 28)
    const snowPillarCapCopy = this.foregroundLayer.getTileAt(8, 28)
    const snowPillarBase = obstacles.getTileAt(8, 29)
    if (
      snowPillarCap?.index !== 2404 ||
      snowPillarCap.collides ||
      snowPillarCapCopy?.index !== 2404 ||
      snowPillarCapCopy.collides
    ) {
      this.errors.push('Snowfield pillar cap at (8, 28) should be a non-colliding GID 2404 overlay.')
    }
    if (snowPillarBase?.index !== 2416 || !snowPillarBase.collides) {
      this.errors.push('Snowfield pillar base at (8, 29) must remain solid GID 2416.')
    }

    const mudHutDoor = obstacles.getTileAt(30, 31)
    if (!mudHutDoor || !isWalkableTile(mudHutDoor.index) || mudHutDoor.collides) {
      this.errors.push('Mud hut front door at (30, 31) must remain a walkable threshold.')
    }
  }

  private checkTileDataIntegrity() {
    for (const layer of this.map.layers) {
      const rows = layer.data
      // Object layers carry an empty (or non-grid) `data`, so confirm the first
      // row really is a row of tiles before validating the grid shape.
      if (!Array.isArray(rows) || rows.length === 0 || !Array.isArray(rows[0])) {
        continue
      }
      if (rows.length !== this.map.height) {
        this.errors.push(
          `Layer '${layer.name}' has ${rows.length} rows; expected ${this.map.height}.`,
        )
        continue
      }

      for (const [rowIndex, row] of rows.entries()) {
        if (!Array.isArray(row) || row.length !== this.map.width) {
          this.errors.push(
            `Layer '${layer.name}' row ${rowIndex} has an invalid column count.`,
          )
          continue
        }
        for (const [columnIndex, tile] of row.entries()) {
          if (
            tile &&
            tile.index >= 0 &&
            !this.map.tilesets.some((tileset) => tileset.containsTileIndex(tile.index))
          ) {
            this.errors.push(
              `Layer '${layer.name}' cell (${columnIndex}, ${rowIndex}) references unknown GID ${tile.index}.`,
            )
          }
          // 0b_GroundDecor is optional and visual-only. When present, verify
          // its tile grid is valid (above) and that no decorative tile collides.
          if (layer.name === '0b_GroundDecor' && tile?.collides) {
            this.errors.push(
              `Ground decor cell (${columnIndex}, ${rowIndex}) is collidable; decorative layers must stay non-solid.`,
            )
          }
        }
      }
    }
  }

  private checkGroundCollision() {
    let collidingTiles = 0
    this.groundLayer.layer.data.forEach((row) =>
      row.forEach((tile) => {
        if (tile?.collides) {
          collidingTiles += 1
        }
      }),
    )
    if (collidingTiles > 0) {
      this.errors.push(`Ground layer has ${collidingTiles} colliding tiles; expected none.`)
    }
    if (this.groundLayer.layer.bodies.length > 0) {
      this.errors.push(`Ground layer has ${this.groundLayer.layer.bodies.length} physics bodies.`)
    }
  }

  /** Every obstacle tile outside the explicit passage allowlist must stay solid. */
  private checkSolidObstacles() {
    for (const layer of this.obstacleLayers) {
      for (let tileY = 0; tileY < layer.layer.height; tileY += 1) {
        for (let tileX = 0; tileX < layer.layer.width; tileX += 1) {
          const tile = layer.getTileAt(tileX, tileY)
          if (!tile || tile.index === -1) {
            continue
          }
          // The quest state deliberately overrides the walkable GIDs in this gate.
          if (isInsideGateLock(TORII_GATE_LOCK, tileX, tileY)) {
            continue
          }
          const shouldCollide =
            !isWalkableTile(tile.index) && !NON_SOLID_OVERHANG_TILE_IDS.has(tile.index)
          if (tile.collides !== shouldCollide) {
            this.errors.push(
              `Obstacle tile (${tileX}, ${tileY}) with GID ${tile.index} has incorrect collision.`,
            )
          }
        }
      }
    }

    const obstacles = this.obstacleLayers.find((layer) => layer.layer.name === '1_Obstacles')
    if (!obstacles) {
      return
    }
    for (const [x, y] of [
      [29, 30],
      [31, 30],
      [32, 30],
      [33, 30],
      [34, 30],
      [29, 31],
      [31, 31],
      [32, 31],
      [33, 31],
      [34, 31],
      [29, 34],
      [31, 33],
      [32, 33],
      [31, 34],
      [32, 34],
      [33, 34],
      [34, 34],
      [26, 2],
      [27, 2],
      [28, 2],
      [29, 2],
      [30, 2],
      [31, 2],
      [32, 2],
      [33, 2],
      [34, 2],
      [26, 8],
      [27, 8],
      [31, 9],
      [32, 9],
      [33, 9],
      [34, 9],
      [32, 16],
      [33, 16],
      [7, 23],
      [8, 23],
      [16, 23],
      [17, 23],
      [29, 23],
      [31, 23],
      [9, 23],
      [10, 23],
      [14, 23],
      [15, 23],
    ]) {
      const tile = obstacles.getTileAt(x, y)
      if (!tile?.collides) {
        this.errors.push(`Structure base or trunk at (${x}, ${y}) must remain solid.`)
      }
    }
    const pinkTreeTrunk = obstacles.getTileAt(29, 34)
    if (pinkTreeTrunk?.index !== 2364 || !pinkTreeTrunk.collides) {
      this.errors.push('The pink tree trunk at (29, 34) must remain solid.')
    }

    const villagePillarTops = [
      { x: 10, y: 20, gid: 1619 },
      { x: 14, y: 20, gid: 1619 },
      { x: 10, y: 21, gid: 1652 },
      { x: 14, y: 21, gid: 1652 },
      { x: 9, y: 22, gid: 1688 },
      { x: 14, y: 22, gid: 1688 },
      { x: 10, y: 22, gid: 1689 },
      { x: 15, y: 22, gid: 1689 },
    ]
    for (const { x, y, gid } of villagePillarTops) {
      const source = obstacles.getTileAt(x, y)
      const copy = this.foregroundLayer.getTileAt(x, y)
      if (source?.index !== gid || source.collides || copy?.index !== gid || copy.collides) {
        this.errors.push(
          `Village pillar top at (${x}, ${y}) should duplicate non-colliding GID ${gid}.`,
        )
      }
    }
    for (const { x, y } of [
      { x: 9, y: 23 },
      { x: 10, y: 23 },
      { x: 14, y: 23 },
      { x: 15, y: 23 },
    ]) {
      if (!obstacles.getTileAt(x, y)?.collides) {
        this.errors.push(`Village pillar base at (${x}, ${y}) must remain solid.`)
      }
    }

    const iglooRoofTiles = [
      { x: 12, y: 30, gid: 1487 },
      { x: 13, y: 30, gid: 1488 },
      { x: 14, y: 30, gid: 1489 },
      { x: 16, y: 30, gid: 1490 },
      { x: 17, y: 30, gid: 1491 },
      { x: 18, y: 30, gid: 1492 },
    ]
    for (const { x, y, gid } of iglooRoofTiles) {
      const source = obstacles.getTileAt(x, y)
      const copy = this.foregroundLayer.getTileAt(x, y)
      if (source?.index !== gid || source.collides || copy?.index !== gid || copy.collides) {
        this.errors.push(`Snow house roof at (${x}, ${y}) should duplicate non-colliding GID ${gid}.`)
      }
    }

    const snowTreeCanopy = [
      { x: 1, y: 27, gid: 2011 },
      { x: 2, y: 27, gid: 2012 },
      { x: 3, y: 27, gid: 2013 },
      { x: 4, y: 27, gid: 2014 },
      { x: 1, y: 28, gid: 2035 },
      { x: 2, y: 28, gid: 2036 },
      { x: 3, y: 28, gid: 2037 },
      { x: 4, y: 28, gid: 2038 },
    ]
    for (const { x, y, gid } of snowTreeCanopy) {
      const source = obstacles.getTileAt(x, y)
      const copy = this.foregroundLayer.getTileAt(x, y)
      if (source?.index !== gid || source.collides || copy?.index !== gid || copy.collides) {
        this.errors.push(`Snow tree canopy at (${x}, ${y}) should duplicate non-colliding GID ${gid}.`)
      }
    }

  }

  private checkDungeonPhysics() {
    const bounds = this.scene.physics.world.bounds
    const worldBoundsMatchMap =
      bounds.x === 0 &&
      bounds.y === 0 &&
      bounds.width === this.map.widthInPixels &&
      bounds.height === this.map.heightInPixels
    const body = this.player.body as Phaser.Physics.Arcade.Body
    const playerCollidesWithWorldBounds = body.collideWorldBounds
    if (!worldBoundsMatchMap) {
      this.errors.push(
        `Physics world bounds (${bounds.x}, ${bounds.y}, ${bounds.width}, ${bounds.height}) do not match the map (${this.map.widthInPixels}x${this.map.heightInPixels}).`,
      )
    }
    if (!playerCollidesWithWorldBounds) {
      this.errors.push('Player body is not configured to collide with world bounds.')
    }

    // Check that every occupied dungeon structure cell follows the same
    // upper-art versus solid-base collision contract as the rest of the map.
    let dungeonObstacleTilesChecked = 0
    const dungeonLayer = this.obstacleLayers.find((layer) => layer.layer.name === '1_Obstacles')
    if (!dungeonLayer) {
      this.errors.push("Dungeon obstacle layer '1_Obstacles' is missing.")
    } else {
      for (let tileY = 0; tileY <= 5; tileY += 1) {
        for (let tileX = 26; tileX <= 34; tileX += 1) {
          const tile = dungeonLayer.getTileAt(tileX, tileY)
          if (!tile || tile.index === -1) {
            continue
          }
          dungeonObstacleTilesChecked += 1
          const expectedCollision =
            !isWalkableTile(tile.index) && !NON_SOLID_OVERHANG_TILE_IDS.has(tile.index)
          if (tile.collides !== expectedCollision) {
            this.errors.push(`Dungeon structure tile (${tileX}, ${tileY}) has incorrect collision.`)
          }
        }
      }
    }

    let desertBoulderTilesChecked = 0
    const boulderTiles = [
      ...[7, 8, 9].flatMap((tileY) =>
        [31, 32, 33, 34].map((tileX) => ({ x: tileX, y: tileY })),
      ),
      { x: 32, y: 15 },
      { x: 33, y: 15 },
      { x: 32, y: 16 },
      { x: 33, y: 16 },
    ]
    const desertLayer = this.obstacleLayers.find((layer) => layer.layer.name === '1_Obstacles')
    if (!desertLayer) {
      this.errors.push("Desert obstacle layer '1_Obstacles' is missing.")
    } else {
      for (const { x, y } of boulderTiles) {
        desertBoulderTilesChecked += 1
        const tile = desertLayer.getTileAt(x, y)
        const isUpperTier = y === 7 || (x >= 31 && x <= 34 && y === 8) || (x >= 32 && x <= 33 && y === 15)
        if (
          !tile ||
          tile.index === -1 ||
          isWalkableTile(tile.index) ||
          tile.collides === isUpperTier
        ) {
          this.errors.push(
            `Desert boulder tile (${x}, ${y}) has an incorrect upper-tier/base collision state.`,
          )
        }
      }

      const smallBoulder = [
        { x: 32, y: 15, gid: 2091 },
        { x: 33, y: 15, gid: 2092 },
        { x: 32, y: 16, gid: 2115 },
        { x: 33, y: 16, gid: 2116 },
      ]
      for (const { x, y, gid } of smallBoulder) {
        if (desertLayer.getTileAt(x, y)?.index !== gid) {
          this.errors.push(
            `Small desert boulder tile (${x}, ${y}) should use GID ${gid}.`,
          )
        }
      }

      const brownBoulderBase = [26, 27, 28, 29].map((x) => desertLayer.getTileAt(x, 17))
      if (brownBoulderBase.some((tile) => !tile?.collides)) {
        this.errors.push('Brown desert boulder base row must remain solid.')
      }
    }

    return {
      worldBoundsMatchMap,
      playerCollidesWithWorldBounds,
      dungeonObstacleTilesChecked,
      desertBoulderTilesChecked,
    }
  }

  /**
   * Passage tiles are exempted from collision by tile ID (see
   * `map/walkableTileIds.ts`), so this check is derived from that same allowlist
   * instead of from hard-coded coordinates. It fails if a passage tile was never
   * found (a stale tile ID) or if it is still collidable.
   */
  private checkWalkablePassages() {
    const groups = WALKABLE_TILE_ID_GROUPS.map((group) => {
      let tilesFound = 0
      let openTiles = 0
      let lockedGateTiles = 0

      for (const layer of this.obstacleLayers) {
        for (let tileY = 0; tileY < layer.layer.height; tileY += 1) {
          for (let tileX = 0; tileX < layer.layer.width; tileX += 1) {
            const tile = layer.getTileAt(tileX, tileY)
            if (!tile || !group.tileIds.includes(tile.index)) {
              continue
            }
            tilesFound += 1
            if (tile.collides) {
              // A passage tile inside the quest gate is expected to be solid
              // while the Array Sorting challenge is unsolved, so it is not
              // reported as a collision bug.
              if (isInsideGateLock(TORII_GATE_LOCK, tileX, tileY)) {
                lockedGateTiles += 1
                continue
              }
              this.errors.push(
                `Walkable passage '${group.name}' tile (${tileX}, ${tileY}) with GID ${tile.index} is still collidable.`,
              )
            } else {
              openTiles += 1
            }
          }
        }
      }

      if (tilesFound === 0) {
        this.warnings.push(
          `Walkable passage '${group.name}' matched no tiles on the obstacle layer; its tile IDs are probably stale.`,
        )
      }

      return { name: group.name, tileIds: [...group.tileIds], tilesFound, openTiles }
    })

    return {
      groups,
      totalTilesFound: groups.reduce((total, group) => total + group.tilesFound, 0),
    }
  }

  private checkReachability() {
    const spawnTile = {
      x: Math.floor(this.player.x / this.map.tileWidth),
      y: Math.floor(this.player.y / this.map.tileHeight),
    }
    const walkableTiles = this.countWalkableTiles()
    const reachable = this.findReachableTiles(spawnTile.x, spawnTile.y)
    const reachableTiles = reachable.reduce((total, value) => total + value, 0)
    const archway = WALKABLE_TILE_ID_GROUPS.find((group) => group.name === 'desert/cave archway')
    let desertCaveArchwayReachable = false

    if (archway) {
      for (const layer of this.obstacleLayers) {
        for (let tileY = 0; tileY < layer.layer.height; tileY += 1) {
          for (let tileX = 0; tileX < layer.layer.width; tileX += 1) {
            const tile = layer.getTileAt(tileX, tileY)
            if (
              tile &&
              archway.tileIds.includes(tile.index) &&
              reachable[tileY * this.map.width + tileX]
            ) {
              desertCaveArchwayReachable = true
            }
          }
        }
      }
    }
    if (!desertCaveArchwayReachable) {
      this.errors.push('The desert/cave archway is not reachable from the spawn; entry and exit are blocked.')
    }

    if (this.isSolidTile(spawnTile.x, spawnTile.y)) {
      this.errors.push(
        `Player spawn tile (${spawnTile.x}, ${spawnTile.y}) is inside a collidable tile.`,
      )
    }
    if (reachableTiles < reachableTileBaseline) {
      this.warnings.push(
        `Only ${reachableTiles} tiles are reachable from the spawn; expected at least ${reachableTileBaseline}. A passage may have been walled off.`,
      )
    }

    return { spawnTile, reachableTiles, walkableTiles, desertCaveArchwayReachable }
  }

  private checkPlayerBoundaryCollision() {
    const body = this.player.body as Phaser.Physics.Arcade.Body
    const bounds = this.scene.physics.world.bounds
    if (
      body.left < bounds.left ||
      body.right > bounds.right ||
      body.top < bounds.top ||
      body.bottom > bounds.bottom
    ) {
      this.errors.push(
        `Player body is outside world bounds at (${body.left}, ${body.top}, ${body.right}, ${body.bottom}).`,
      )
    }
  }

  private isSolidTile(tileX: number, tileY: number): boolean {
    if (tileX < 0 || tileY < 0 || tileX >= this.map.width || tileY >= this.map.height) {
      return true
    }
    return this.obstacleLayers.some((layer) => layer.getTileAt(tileX, tileY)?.collides === true)
  }

  private countWalkableTiles(): number {
    let walkable = 0
    for (let tileY = 0; tileY < this.map.height; tileY += 1) {
      for (let tileX = 0; tileX < this.map.width; tileX += 1) {
        if (!this.isSolidTile(tileX, tileY)) {
          walkable += 1
        }
      }
    }
    return walkable
  }

  private findReachableTiles(startX: number, startY: number): Uint8Array {
    const width = this.map.width
    const visited = new Uint8Array(width * this.map.height)
    if (this.isSolidTile(startX, startY)) {
      return visited
    }

    const stack: number[] = [startX, startY]
    visited[startY * width + startX] = 1

    while (stack.length > 0) {
      const tileY = stack.pop()!
      const tileX = stack.pop()!

      const neighbours = [
        [tileX + 1, tileY],
        [tileX - 1, tileY],
        [tileX, tileY + 1],
        [tileX, tileY - 1],
      ]
      for (const [nextX, nextY] of neighbours) {
        if (this.isSolidTile(nextX, nextY)) {
          continue
        }
        const index = nextY * width + nextX
        if (visited[index]) {
          continue
        }
        visited[index] = 1
        stack.push(nextX, nextY)
      }
    }

    return visited
  }

  private runRandomMovementStressTest(steps: number) {
    const body = this.player.body as Phaser.Physics.Arcade.Body
    const directions = [
      { x: 16, y: 0 },
      { x: -16, y: 0 },
      { x: 0, y: 16 },
      { x: 0, y: -16 },
    ]
    let x = body.x
    let y = body.y
    let blocked = 0
    let randomState = 0x5eed

    const nextRandom = () => {
      randomState = (randomState * 1664525 + 1013904223) >>> 0
      return randomState / 0x100000000
    }

    for (let index = 0; index < steps; index += 1) {
      const direction = directions[Math.floor(nextRandom() * directions.length)]
      const targetX = x + direction.x
      const targetY = y + direction.y
      const withinBounds =
        targetX >= this.scene.physics.world.bounds.left &&
        targetY >= this.scene.physics.world.bounds.top &&
        targetX + body.width <= this.scene.physics.world.bounds.right &&
        targetY + body.height <= this.scene.physics.world.bounds.bottom
      const overlapsTile = this.obstacleLayers.some((layer) => {
        const left = Math.floor(targetX / this.map.tileWidth)
        const right = Math.floor((targetX + body.width - 1) / this.map.tileWidth)
        const top = Math.floor(targetY / this.map.tileHeight)
        const bottom = Math.floor((targetY + body.height - 1) / this.map.tileHeight)
        for (let tileY = top; tileY <= bottom; tileY += 1) {
          for (let tileX = left; tileX <= right; tileX += 1) {
            if (layer.getTileAt(tileX, tileY)?.collides) {
              return true
            }
          }
        }
        return false
      })
      const overlapsSolid =
        overlapsTile ||
        [...this.scene.physics.world.staticBodies].some(
          (obstacle) =>
            obstacle.enable &&
            targetX < obstacle.position.x + obstacle.width &&
            targetX + body.width > obstacle.position.x &&
            targetY < obstacle.position.y + obstacle.height &&
            targetY + body.height > obstacle.position.y,
        )

      if (!withinBounds || overlapsSolid) {
        blocked += 1
        continue
      }

      x = targetX
      y = targetY
    }

    if (steps > 0 && blocked / steps > 0.8) {
      this.warnings.push(
        `High collision density: ${blocked} of ${steps} deterministic movement probes were blocked.`,
      )
    }

    return {
      steps,
      blocked,
      completed: steps - blocked,
    }
  }
}
