import Phaser from 'phaser'
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
import { MainScene } from './MainScene'

/** Loads the game payload once, then hands the already-populated Phaser caches to MainScene. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene')
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
    this.scene.start('MainScene')
  }
}

export const gameScenes = [BootScene, MainScene]
