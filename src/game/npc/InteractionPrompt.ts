import Phaser from 'phaser'

/**
 * The floating "E / Space" prompt shown when the player is close enough to an
 * NPC. Drawn as a Phaser object rather than DOM so it sits in world space and
 * scrolls with the camera.
 */
export class InteractionPrompt {
  private readonly container: Phaser.GameObjects.Container
  private visible = false

  constructor(scene: Phaser.Scene) {
    const icon = scene.add.image(-60, 0, 'ui-key-e').setDisplaySize(16, 16)
    const text = scene.add
      .text(-37, 0, 'Press E to interact', {
        fontFamily: '"Courier New", ui-monospace, monospace',
        fontSize: '11px',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0, 0.5)
      .setResolution(1)
    text.setPosition(Math.round(text.x), Math.round(text.y))
    this.container = scene.add
      .container(0, 0, [icon, text])
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
    // Keep the prompt behind the foreground layer so tall art never covers it.
    if (!this.visible) {
      this.container.setVisible(true)
      this.visible = true
    }
  }

  hide(): void {
    if (this.visible) {
      this.container.setVisible(false)
      this.visible = false
    }
  }

  destroy(): void {
    this.container.destroy()
  }
}
