import villageMapUrl from '../assets/tiles/ninja-village/MAP.json?url'
import hunterIdleUrl from '../assets/tiles/ninja-village/Hunter/SeparateAnim/Idle.png'
import hunterWalkUrl from '../assets/tiles/ninja-village/Hunter/SeparateAnim/Walk.png'
import fieldTilesetUrl from '../assets/tiles/ninja-village/TilesetField.png'
import floorTilesetUrl from '../assets/tiles/ninja-village/TilesetFloor.png'
import houseTilesetUrl from '../assets/tiles/ninja-village/TilesetHouse.png'
import natureTilesetUrl from '../assets/tiles/ninja-village/TilesetNature.png'
import reliefTilesetUrl from '../assets/tiles/ninja-village/TilesetRelief.png'
import reliefDetailTilesetUrl from '../assets/tiles/ninja-village/TilesetReliefDetail.png'
import waterTilesetUrl from '../assets/tiles/ninja-village/TilesetWater.png'
import elderIdleUrl from '../assets/tiles/ninja-village/Elder/Idle.png'
import elderWalkUrl from '../assets/tiles/ninja-village/Elder/Walk.png'
import elderPortraitUrl from '../assets/tiles/ninja-village/Elder/Faceset.png'
import keyEUrl from '../assets/UI/KeyE.png'
import dialogInfoUrl from '../assets/UI/DialogInfo.png'
import adventureMusicUrl from '../assets/audio/dsa-quest-adventure.ogg'

const imageUrls = [
  hunterIdleUrl,
  hunterWalkUrl,
  fieldTilesetUrl,
  floorTilesetUrl,
  houseTilesetUrl,
  natureTilesetUrl,
  reliefTilesetUrl,
  reliefDetailTilesetUrl,
  waterTilesetUrl,
  elderIdleUrl,
  elderWalkUrl,
  elderPortraitUrl,
  keyEUrl,
  dialogInfoUrl,
]

const audioUrls = [
  '/audio/38-Intro.ogg',
  adventureMusicUrl,
]

let preloadPromise: Promise<void> | null = null

function preloadImage(url: string) {
  return new Promise<void>((resolve) => {
    const image = new Image()
    image.onload = () => resolve()
    image.onerror = () => resolve()
    image.src = url
  })
}

export function preloadGameAssets() {
  if (!preloadPromise) {
    preloadPromise = Promise.all([
      ...imageUrls.map(preloadImage),
      fetch(villageMapUrl, { cache: 'force-cache' }).then(() => undefined).catch(() => undefined),
      ...audioUrls.map((url) => fetch(url, { cache: 'force-cache' }).then(() => undefined).catch(() => undefined)),
    ]).then(() => undefined)
  }
  return preloadPromise
}
