import Phaser from 'phaser'

/** Shared visual tokens for the hero and NPC name plates. */
export const NAME_TAG_STYLE = {
  fontFamily: '"Press Start 2P", monospace',
  fallbackFontFamily: '"Courier New", monospace',
  fontSize: '8px',
  hero: { color: '#fff1dc', borderColor: '#f3b46b' },
  npc: { color: '#ffd98a', borderColor: '#ffd98a' },
  plateColor: '#2b1608',
  plateOpacity: 0.6,
  opacity: 0.92,
  borderWidth: 1,
  cornerRadius: 3,
  paddingX: 4,
  paddingY: 2,
  notchHeight: 3,
  notchHalfWidth: 3,
  shadowOffsetX: 1,
  shadowOffsetY: 1,
  shadowColor: '#1b0e05',
  shadowBlur: 0,
  depth: 1100,
  offscreenMargin: 16,
  hudAvoidanceHeight: 64,
  hudCornerWidth: 144,
} as const

export const NPC_TAG_SHOW_DISTANCE = 96
export const NPC_TAG_HIDE_DISTANCE = 120
export const NPC_TAG_FADE_MS = 200

/** A positioned Phaser object, such as a player or NPC sprite. */
export type NameTagTarget = {
  x: number
  y: number
  displayHeight: number
  /** Phaser's vertical origin: 0 is top, .5 is centre, 1 is feet. */
  originY?: number
  active?: boolean
}

export type NameTagProximityOptions = {
  target: NameTagTarget
  showDistance: number
  hideDistance: number
  fadeMs: number
}

export type NameTagOptions = {
  /** Keep the original player behavior; set false for NPC tags. */
  clampToView?: boolean
  /** When provided, fade the tag in/out based on distance to another object. */
  proximity?: NameTagProximityOptions
}

export type NameTagStyleOverrides = {
  fontFamily?: string
  fontSize?: string
  color?: string
  borderColor?: string
  plateColor?: string
  plateOpacity?: number
  alpha?: number
  borderWidth?: number
  cornerRadius?: number
  paddingX?: number
  paddingY?: number
  notchHeight?: number
  notchHalfWidth?: number
  shadowOffsetX?: number
  shadowOffsetY?: number
  shadowColor?: string
  shadowBlur?: number
  depth?: number
}

type ResolvedNameTagStyle = {
  fontFamily: string
  fontSize: string
  color: string
  borderColor: string
  plateColor: string
  plateOpacity: number
  alpha: number
  borderWidth: number
  cornerRadius: number
  paddingX: number
  paddingY: number
  notchHeight: number
  notchHalfWidth: number
  shadowOffsetX: number
  shadowOffsetY: number
  shadowColor: string
  shadowBlur: number
  depth: number
}

/**
 * A small, crisp name plate attached to any positioned game object.
 * The container counter-scales against camera zoom so its on-screen size is fixed.
 */
export class NameTag {
  private scene: Phaser.Scene | null = null
  private target: NameTagTarget | null = null
  private camera: Phaser.Cameras.Scene2D.Camera | null = null
  private container: Phaser.GameObjects.Container | null = null
  private plate: Phaser.GameObjects.Graphics | null = null
  private label: Phaser.GameObjects.Text | null = null
  private destroyed = false
  private lastZoom = 0
  private lastResolution = 0
  private visible = true
  private targetInView = true
  private proximityActive = false
  private currentAlpha = 0
  private plateWidth = 0
  private plateHeight = 0
  private text = ''
  private styleOverrides: NameTagStyleOverrides
  private style: ResolvedNameTagStyle | null = null
  private readonly options: NameTagOptions

  private readonly handleResize = () => {
    this.syncScreenSize(true)
    this.update()
  }

  constructor(
    styleOverrides: NameTagStyleOverrides = {},
    options: NameTagOptions = {},
  ) {
    this.styleOverrides = { ...styleOverrides }
    this.options = options
    this.proximityActive = !options.proximity
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
    this.styleOverrides = { ...this.styleOverrides, ...styleOverrides }
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize)

    // homeScreen.css owns the existing Google Fonts import. Waiting for it and
    // explicitly loading/checking this exact face prevents an early fallback.
    const fontFamily = await this.resolveFontFamily(this.text)
    if (this.destroyed || !this.scene || !this.target || !this.camera) return

    this.style = this.resolveStyle(this.styleOverrides, fontFamily)
    this.currentAlpha = this.options.proximity ? 0 : this.style.alpha

    this.plate = scene.add.graphics()
    this.label = scene.add.text(0, 0, this.text, {
      fontFamily: this.style.fontFamily,
      fontSize: this.style.fontSize,
      color: this.style.color,
    })
      .setOrigin(0.5, 0)
      .setShadow(
        this.style.shadowOffsetX,
        this.style.shadowOffsetY,
        this.style.shadowColor,
        this.style.shadowBlur,
        false,
        true,
      )

    this.container = scene.add.container(0, 0, [this.plate, this.label])
      .setDepth(this.style.depth)
      .setScrollFactor(1, 1)
      .setAlpha(this.currentAlpha)

    this.syncScreenSize(true)
    this.rebuildPlate()
    this.update()
  }

  setText(text: string): void {
    this.text = text
    this.label?.setText(text)
    // Re-measure the new text so the plate fits the actual glyphs.
    this.rebuildPlate()
    this.update()
  }

  setVisible(visible: boolean): void {
    this.visible = visible
    this.container?.setVisible(
      this.visible && this.targetInView && (!this.options.proximity || this.currentAlpha > 0),
    )
  }

  update(): void {
    const scene = this.scene
    const target = this.target
    const camera = this.camera
    const container = this.container
    const label = this.label
    if (
      this.destroyed ||
      !scene ||
      !target ||
      !camera ||
      !container ||
      !label ||
      !label.active ||
      target.active === false
    ) return

    const zoom = Math.max(0.1, camera.zoom || 1)
    const view = camera.worldView
    const marginWorld = NAME_TAG_STYLE.offscreenMargin / zoom
    const right = view.x + view.width
    const bottom = view.y + view.height

    // Evaluate hysteresis before the off-screen check, so the NPC can reappear
    // with the correct fade state when it returns to camera view.
    const proximity = this.options.proximity
    if (proximity) {
      const distance = Phaser.Math.Distance.Between(
        target.x,
        target.y,
        proximity.target.x,
        proximity.target.y,
      )
      if (!this.proximityActive && distance <= proximity.showDistance) {
        this.proximityActive = true
      } else if (this.proximityActive && distance >= proximity.hideDistance) {
        this.proximityActive = false
      }
    }

    this.targetInView = target.x >= view.x - marginWorld &&
      target.x <= right + marginWorld &&
      target.y >= view.y - marginWorld &&
      target.y <= bottom + marginWorld

    // NPC tags are never clamped to camera edges. An off-screen target means
    // an invisible tag, not a label pinned to the viewport border.
    if (this.options.clampToView === false && !this.targetInView) {
      this.currentAlpha = 0
      container.setAlpha(0)
      container.setVisible(false)
      return
    }

    if (!this.visible) {
      container.setVisible(false)
      return
    }

    const maxAlpha = this.style?.alpha ?? NAME_TAG_STYLE.opacity
    const fadeMs = proximity?.fadeMs ?? NPC_TAG_FADE_MS
    const delta = Math.min(50, Math.max(0, scene.game.loop.delta || 16))
    const alphaStep = fadeMs <= 0 ? maxAlpha : (maxAlpha * delta) / fadeMs
    const desiredAlpha = this.proximityActive ? maxAlpha : 0
    if (this.currentAlpha < desiredAlpha) {
      this.currentAlpha = Math.min(desiredAlpha, this.currentAlpha + alphaStep)
    } else if (this.currentAlpha > desiredAlpha) {
      this.currentAlpha = Math.max(desiredAlpha, this.currentAlpha - alphaStep)
    }
    container.setAlpha(this.currentAlpha)

    // Still check proximity above, but skip positioning/plate work once a tag
    // is fully faded out.
    if (proximity && !this.proximityActive && this.currentAlpha <= 0) {
      container.setVisible(false)
      return
    }

    container.setVisible(this.currentAlpha > 0)
    if (this.currentAlpha <= 0) return

    this.syncScreenSize()
    const style = this.style
    if (!style) return

    const totalHeight = this.plateHeight + style.notchHeight
    const halfWidthWorld = (this.plateWidth / 2) / zoom
    let x = target.x
    const originY = target.originY ?? 0.5
    const headY = target.y - target.displayHeight * originY
    let y = headY - 4 / zoom

    if (this.options.clampToView !== false) {
      const minX = view.x + halfWidthWorld + marginWorld
      const maxX = right - halfWidthWorld - marginWorld
      x = minX <= maxX ? Phaser.Math.Clamp(x, minX, maxX) : view.x + view.width / 2
      y = Math.max(y, view.y + totalHeight / zoom + marginWorld)
      y = Math.min(y, bottom - marginWorld)

      // Keep the player's plate clear of the corner Sound/Stats HUD buttons.
      const screenX = (x - view.x) * zoom
      const screenTop = (y - view.y) * zoom - totalHeight
      if (
        screenTop < NAME_TAG_STYLE.hudAvoidanceHeight &&
        (
          screenX - this.plateWidth / 2 < NAME_TAG_STYLE.hudCornerWidth ||
          screenX + this.plateWidth / 2 > camera.width - NAME_TAG_STYLE.hudCornerWidth
        )
      ) {
        y = view.y + (NAME_TAG_STYLE.hudAvoidanceHeight + totalHeight + 4) / zoom
      }
    } else {
      // Never shift an NPC plate to avoid HUD: hide it briefly rather than
      // making its screen position appear unrelated to the NPC.
      const screenX = (x - view.x) * zoom
      const screenTop = (y - view.y) * zoom - totalHeight
      const overlapsTopHud = screenTop < NAME_TAG_STYLE.hudAvoidanceHeight &&
        (
          screenX - this.plateWidth / 2 < NAME_TAG_STYLE.hudCornerWidth ||
          screenX + this.plateWidth / 2 > camera.width - NAME_TAG_STYLE.hudCornerWidth
        )
      if (overlapsTopHud) {
        container.setVisible(false)
        return
      }
    }

    container.setPosition(Math.round(x), Math.round(y))
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.scene?.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize)
    this.container?.destroy(true)
    this.container = null
    this.plate = null
    this.label = null
    this.target = null
    this.camera = null
    this.scene = null
    this.style = null
  }

  private async resolveFontFamily(text: string): Promise<string> {
    if (typeof document === 'undefined' || !document.fonts) {
      return NAME_TAG_STYLE.fallbackFontFamily
    }
    const fontQuery = NAME_TAG_STYLE.fontSize + ' "Press Start 2P"'
    try {
      await document.fonts.ready
      const loadedFaces = await document.fonts.load(fontQuery, text)
      const loaded = loadedFaces.length > 0 && document.fonts.check(fontQuery, text)
      return loaded ? NAME_TAG_STYLE.fontFamily : NAME_TAG_STYLE.fallbackFontFamily
    } catch {
      return NAME_TAG_STYLE.fallbackFontFamily
    }
  }

  private resolveStyle(
    overrides: NameTagStyleOverrides,
    fontFamily: string,
  ): ResolvedNameTagStyle {
    const defaultVariant = overrides.color === NAME_TAG_STYLE.npc.color
      ? NAME_TAG_STYLE.npc
      : NAME_TAG_STYLE.hero
    return {
      fontFamily: overrides.fontFamily ?? fontFamily,
      fontSize: overrides.fontSize ?? NAME_TAG_STYLE.fontSize,
      color: overrides.color ?? defaultVariant.color,
      borderColor: overrides.borderColor ?? defaultVariant.borderColor,
      plateColor: overrides.plateColor ?? NAME_TAG_STYLE.plateColor,
      plateOpacity: overrides.plateOpacity ?? NAME_TAG_STYLE.plateOpacity,
      alpha: overrides.alpha ?? NAME_TAG_STYLE.opacity,
      borderWidth: overrides.borderWidth ?? NAME_TAG_STYLE.borderWidth,
      cornerRadius: overrides.cornerRadius ?? NAME_TAG_STYLE.cornerRadius,
      paddingX: overrides.paddingX ?? NAME_TAG_STYLE.paddingX,
      paddingY: overrides.paddingY ?? NAME_TAG_STYLE.paddingY,
      notchHeight: overrides.notchHeight ?? NAME_TAG_STYLE.notchHeight,
      notchHalfWidth: overrides.notchHalfWidth ?? NAME_TAG_STYLE.notchHalfWidth,
      shadowOffsetX: overrides.shadowOffsetX ?? NAME_TAG_STYLE.shadowOffsetX,
      shadowOffsetY: overrides.shadowOffsetY ?? NAME_TAG_STYLE.shadowOffsetY,
      shadowColor: overrides.shadowColor ?? NAME_TAG_STYLE.shadowColor,
      shadowBlur: overrides.shadowBlur ?? NAME_TAG_STYLE.shadowBlur,
      depth: overrides.depth ?? NAME_TAG_STYLE.depth,
    }
  }

  private syncScreenSize(force = false): void {
    const label = this.label
    const container = this.container
    const camera = this.camera
    if (!label || !container || !camera) return
    const zoom = Math.max(0.1, camera.zoom || 1)
    const dpr = typeof window === 'undefined' ? 1 : Math.max(1, window.devicePixelRatio || 1)
    const resolution = dpr * zoom
    if (
      force ||
      Math.abs(zoom - this.lastZoom) > 0.001 ||
      Math.abs(resolution - this.lastResolution) > 0.001
    ) {
      container.setScale(1 / zoom)
      label.setResolution(resolution)
      this.lastZoom = zoom
      this.lastResolution = resolution
      this.rebuildPlate()
    }
  }

  private rebuildPlate(): void {
    const label = this.label
    const plate = this.plate
    const style = this.style
    if (!label || !plate || !style) return

    const textWidth = label.width
    const textHeight = label.height
    this.plateWidth = textWidth + style.paddingX * 2
    this.plateHeight = textHeight + style.paddingY * 2
    const left = -this.plateWidth / 2
    const top = -style.notchHeight - this.plateHeight
    const fillColor = Number.parseInt(style.plateColor.replace('#', ''), 16)
    const borderColor = Number.parseInt(style.borderColor.replace('#', ''), 16)

    plate.clear()
    plate.fillStyle(fillColor, style.plateOpacity)
    plate.fillRoundedRect(left, top, this.plateWidth, this.plateHeight, style.cornerRadius)
    plate.fillTriangle(
      0, 0,
      -style.notchHalfWidth, -style.notchHeight,
      style.notchHalfWidth, -style.notchHeight,
    )
    plate.lineStyle(style.borderWidth, borderColor, 1)
    plate.strokeRoundedRect(left, top, this.plateWidth, this.plateHeight, style.cornerRadius)
    plate.lineBetween(0, 0, -style.notchHalfWidth, -style.notchHeight)
    plate.lineBetween(0, 0, style.notchHalfWidth, -style.notchHeight)

    label.setPosition(0, top + this.plateHeight / 2 - textHeight / 2)
  }
}
