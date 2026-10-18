import Phaser from 'phaser'

/** Shared visual tokens for every in-game name plate. */
export const NAME_TAG_STYLE = {
  fontFamily: '"Press Start 2P", "Courier New", monospace',
  fontSize: '8px',
  color: '#f3e8cf',
  stroke: '#3b2819',
  strokeThickness: 1,
  alpha: 0.65,
  depth: 1100,
} as const

/** A positioned, sized Phaser display object, such as a player or NPC sprite. */
export type NameTagTarget = {
  x: number
  y: number
  displayHeight: number
  /** Phaser's vertical origin: 0 is top, .5 is centre, 1 is feet. */
  originY?: number
  active?: boolean
}

export type NameTagStyleOverrides = {
  fontFamily?: string
  fontSize?: string
  color?: string
  stroke?: string
  strokeThickness?: number
  backgroundColor?: string
  alpha?: number
  depth?: number
}

/**
 * A subtle, non-physics name plate attached to any positioned game object.
 * Counter-scales against camera zoom so its screen-size stays stable.
 */
export class NameTag {
  private scene: Phaser.Scene | null = null
  private target: NameTagTarget | null = null
  private camera: Phaser.Cameras.Scene2D.Camera | null = null
  private label: Phaser.GameObjects.Text | null = null
  private destroyed = false
  private lastZoom = 0
  private lastResolution = 0
  private visible = true
  private text = ''
  private readonly styleOverrides: NameTagStyleOverrides

  private readonly handleResize = () => {
    this.syncScreenSize(true)
    this.update()
  }

  constructor(styleOverrides: NameTagStyleOverrides = {}) {
    this.styleOverrides = styleOverrides
  }

  async create(
    scene: Phaser.Scene,
    target: NameTagTarget,
    text: string,
    styleOverrides: NameTagStyleOverrides = {},
  ): Promise<void> {
    this.scene = scene
    this.target = target
    this.camera = scene.cameras.main
    this.text = text
    this.destroyed = false
    // Per-create styles override constructor styles; the default tokens remain
    // centralized in NAME_TAG_STYLE for quick tuning.
    Object.assign(this.styleOverrides, styleOverrides)
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize)

    if (typeof document !== 'undefined' && document.fonts) {
      try {
        await document.fonts.ready
        await document.fonts.load(`8px "Press Start 2P"`)
      } catch {
        // Browser font APIs can reject in privacy modes; the fallback remains readable.
      }
    }
    if (this.destroyed || !this.scene || !this.target || !this.camera) return

    const overrides = this.styleOverrides
    this.label = scene.add.text(0, 0, this.text, {
      fontFamily: overrides.fontFamily ?? NAME_TAG_STYLE.fontFamily,
      fontSize: overrides.fontSize ?? NAME_TAG_STYLE.fontSize,
      color: overrides.color ?? NAME_TAG_STYLE.color,
      stroke: overrides.stroke ?? NAME_TAG_STYLE.stroke,
      strokeThickness: overrides.strokeThickness ?? NAME_TAG_STYLE.strokeThickness,
      ...(overrides.backgroundColor ? { backgroundColor: overrides.backgroundColor } : {}),
      padding: 1,
    })
      .setOrigin(0.5, 1)
      .setDepth(overrides.depth ?? NAME_TAG_STYLE.depth)
      .setScrollFactor(1, 1)
      .setAlpha(overrides.alpha ?? NAME_TAG_STYLE.alpha)

    this.syncScreenSize(true)
    this.update()
  }

  setText(text: string): void {
    this.text = text
    this.label?.setText(text)
    this.syncScreenSize(true)
    this.update()
  }

  setVisible(visible: boolean): void {
    this.visible = visible
    this.label?.setVisible(visible)
  }

  update(): void {
    const label = this.label
    const target = this.target
    const camera = this.camera
    if (
      this.destroyed ||
      !label ||
      !target ||
      !camera ||
      !label.active ||
      target.active === false
    ) return

    this.syncScreenSize()
    label.setVisible(this.visible)

    const zoom = Math.max(0.1, camera.zoom || 1)
    const view = camera.worldView
    const halfWidth = label.displayWidth / 2
    const marginWorld = 5 / zoom
    const minX = view.x + halfWidth + marginWorld
    const maxX = view.x + view.width - halfWidth - marginWorld
    let x = target.x
    if (minX <= maxX) {
      x = Phaser.Math.Clamp(x, minX, maxX)
    } else {
      x = view.x + view.width / 2
    }

    // Account for the target's origin, so centre-origin player sprites and
    // feet-origin NPC sprites both place the tag just above their head.
    const originY = target.originY ?? 0.5
    const headY = target.y - target.displayHeight * originY
    let y = headY - 4 / zoom
    y = Math.max(y, view.y + label.displayHeight + marginWorld)
    y = Math.min(y, view.y + view.height - marginWorld)

    // Keep long names away from the top-left Sound and top-right Stats HUD.
    const screenX = (x - view.x) * zoom
    const screenY = (y - view.y) * zoom
    const screenLabelWidth = label.displayWidth * zoom
    if (
      screenY < 62 &&
      (
        screenX - screenLabelWidth / 2 < 118 ||
        screenX + screenLabelWidth / 2 > camera.width - 118
      )
    ) {
      y = Math.min(view.y + (66 / zoom) + label.displayHeight, view.y + view.height - marginWorld)
    }

    label.setPosition(Math.round(x), Math.round(y))
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.scene?.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize)
    this.label?.destroy()
    this.label = null
    this.target = null
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
