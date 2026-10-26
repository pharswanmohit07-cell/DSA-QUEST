import Phaser from 'phaser'

const KEY_TEXTURE = 'ui-key-e-crisp'

/** Floating pixel-art interaction prompt attached to the nearby NPC. */
export class InteractionPrompt {
  private readonly container: Phaser.GameObjects.Container
  private visible = false

  constructor(scene: Phaser.Scene) {
    if (!scene.textures.exists(KEY_TEXTURE)) {
      const pixels = scene.add.graphics()
      // Integer-sized blocks keep the keycap sharp at the game's pixel scale.
      pixels.fillStyle(0x171d2b, 1).fillRect(1, 1, 20, 20)
      pixels.fillStyle(0xd5a34c, 1).fillRect(1, 0, 20, 2).fillRect(0, 1, 2, 20)
      pixels.fillStyle(0xd5a34c, 1).fillRect(19, 1, 2, 20).fillRect(1, 19, 20, 2)
      pixels.fillStyle(0x34465c, 1).fillRect(3, 3, 16, 15)
      pixels.fillStyle(0x60758a, 1).fillRect(4, 4, 14, 2)
      pixels.generateTexture(KEY_TEXTURE, 22, 22)
      pixels.destroy()
    }

    const icon = scene.add.image(-60, 0, KEY_TEXTURE).setOrigin(0.5).setRoundPixels(true)
    const letter = scene.add
      .text(-60, 0, 'E', {
        fontFamily: '"Courier New", monospace',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fff2cf',
        stroke: '#171d2b',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setResolution(2)
    const text = scene.add
      .text(-43, 0, 'Press E to interact', {
        fontFamily: '"Courier New", ui-monospace, monospace',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#FFFFFF',
        stroke: '#171d2b',
        strokeThickness: 3,
      })
      .setOrigin(0, 0.5)
      .setResolution(2)

    this.container = scene.add
      .container(0, 0, [icon, letter, text])
      .setDepth(9000)
      .setVisible(false)
  }

  /** Moves the interaction prompt above the nearby NPC. */
  showFor(npc: { sprite: Phaser.GameObjects.Sprite } | null): void {
    if (!npc) {
      this.hide()
      return
    }

    const { x, y } = npc.sprite
    this.container.setPosition(Math.round(x), Math.round(y - 48))
    if (!this.visible) {
      this.container.setVisible(true)
      this.visible = true
    }
  }

  hide(): void {
    if (!this.visible) return
    this.container.setVisible(false)
    this.visible = false
  }

  destroy(): void {
    this.container.destroy()
  }
}
