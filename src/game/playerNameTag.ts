import Phaser from 'phaser'

/**
 * A lightweight, non-physics name plate attached to the player.
 *
 * Its Phaser scale counteracts the world camera zoom so the name remains a
 * fixed screen size. Text rendering resolution follows zoom and device pixel
 * ratio to keep pixel-font edges sharp on high-DPI displays.
 */
export class PlayerNameTag {
  private scene: Phaser.Scene | null = null
  private player: Phaser.GameObjects.Sprite | null = null
  private camera: Phaser.Cameras.Scene2D.Camera | null = null
  private label: Phaser.GameObjects.Text | null = null
  private destroyed = false
  private lastZoom = 0
  private lastResolution = 0
  private visible = true

  private readonly handleResize = () => {
    this.syncScreenSize(true)
    this.update()
  }

  async create(
    scene: Phaser.Scene,
    player: Phaser.GameObjects.Sprite,
    name: string,
  ): Promise<void> {
    this.scene = scene
    this.player = player
    this.camera = scene.cameras.main
    this.destroyed = false
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize)

    // The title screen and stats UI already request this family. Waiting for the
    // current document font set prevents the name plate's first paint using a
    // narrow fallback and then suddenly changing width when the pixel font loads.
    if (typeof document !== 'undefined' && document.fonts) {
      try {
        await document.fonts.ready
        await document.fonts.load('10px "Press Start 2P"')
      } catch {
        // Browser font APIs can reject in privacy modes; a readable fallback remains.
      }
    }
    if (this.destroyed || !this.scene || !this.player || !this.camera) return

    this.label = scene.add.text(0, 0, name, {
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      fontSize: '10px',
      color: '#fff1dc',
      backgroundColor: '#2b1608e8',
      padding: { left: 5, right: 5, top: 2, bottom: 2 },
      stroke: '#170b04',
      strokeThickness: 2,
      shadow: {
        offsetX: 1,
        offsetY: 2,
        color: '#120802',
        blur: 0,
        fill: true,
        stroke: true,
      },
    })
      .setOrigin(0.5, 1)
      .setDepth(1100)
      .setScrollFactor(1, 1)

    this.syncScreenSize(true)
    this.update()
  }

  setName(name: string): void {
    this.label?.setText(name)
    this.syncScreenSize(true)
    this.update()
  }

  setVisible(visible: boolean): void {
    this.visible = visible
    this.label?.setVisible(visible)
  }

  update(): void {
    const label = this.label
    const player = this.player
    const camera = this.camera
    if (this.destroyed || !label || !player || !camera || !label.active) return

    this.syncScreenSize()
    label.setVisible(this.visible)

    const zoom = Math.max(0.1, camera.zoom || 1)
    const view = camera.worldView
    const halfWidth = label.displayWidth / 2
    const marginWorld = 5 / zoom
    const minX = view.x + halfWidth + marginWorld
    const maxX = view.x + view.width - halfWidth - marginWorld
    let x = player.x
    if (minX <= maxX) {
      x = Phaser.Math.Clamp(x, minX, maxX)
    } else {
      x = view.x + view.width / 2
    }

    const labelHeight = label.displayHeight
    const headY = player.y - player.displayHeight / 2
    let y = headY - 4 / zoom
    // Keep the full label inside the viewport if the player approaches an edge.
    y = Math.max(y, view.y + labelHeight + marginWorld)
    y = Math.min(y, view.y + view.height - marginWorld)

    // Avoid the corner HUD controls if the player is near the top of the view.
    const screenX = (x - view.x) * zoom
    const screenY = (y - view.y) * zoom
    const screenLabelWidth = label.displayWidth * zoom
    const screenViewportWidth = camera.width
    if (
      screenY < 62 &&
      (
        screenX - screenLabelWidth / 2 < 118 ||
        screenX + screenLabelWidth / 2 > screenViewportWidth - 118
      )
    ) {
      y = Math.min(view.y + (66 / zoom) + labelHeight, view.y + view.height - marginWorld)
    }

    label.setPosition(Math.round(x), Math.round(y))
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.scene?.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize)
    this.label?.destroy()
    this.label = null
    this.player = null
    this.camera = null
    this.scene = null
  }

  private syncScreenSize(force = false): void {
    const label = this.label
    const camera = this.camera
    if (!label || !camera) return
    const zoom = Math.max(0.1, camera.zoom || 1)
    const dpr = typeof window === 'undefined' ? 1 : Math.max(1, window.devicePixelRatio || 1)
    const resolution = dpr * zoom
    if (
      force ||
      Math.abs(zoom - this.lastZoom) > 0.001 ||
      Math.abs(resolution - this.lastResolution) > 0.001
    ) {
      label.setScale(1 / zoom)
      label.setResolution(resolution)
      this.lastZoom = zoom
      this.lastResolution = resolution
    }
  }
}
