/**
 * Development-only scene hooks (loaded ONLY in dev builds).
 *
 * This module is reached exclusively through the guarded dynamic import in
 * `MainScene.create()`:
 *
 *   if (import.meta.env.DEV) {
 *     import('./devHooks').then((m) => m.registerDevHooks(this))
 *   }
 *
 * Vite statically replaces `import.meta.env.DEV` with `false` in production
 * builds, so the whole branch (and therefore this module, which has no other
 * importer) is dead-code-eliminated: no `dsa:*` listener code — not even the
 * string literals — reaches the shipped JavaScript.
 *
 * Hooks are stored per-scene in a WeakMap, and Phaser SHUTDOWN/DESTROY events
 * remove them, so restarting the scene never stacks duplicate listeners.
 */
import Phaser from 'phaser'
import { QuestManager } from '../quests/QuestManager'
import type { MainScene } from './MainScene'

type DevHooks = {
  challenge: () => void
  teleport: EventListener
}

const hooksByScene = new WeakMap<MainScene, DevHooks>()

/** Removes (if present) this scene's dev window listeners. */
export function removeDevHooks(scene: MainScene): void {
  const hooks = hooksByScene.get(scene)
  if (!hooks) return
  window.removeEventListener('dsa:open-challenge', hooks.challenge)
  window.removeEventListener('dsa:teleport', hooks.teleport)
  hooksByScene.delete(scene)
}

/**
 * Registers exactly one `dsa:open-challenge` and one `dsa:teleport` listener
 * for the given scene, replacing any previously registered pair (safe across
 * scene restarts), and tears them down on scene shutdown/destroy.
 */
export function registerDevHooks(scene: MainScene): void {
  // Replace (never stack) a previous pair from an earlier create() of this
  // scene instance.
  removeDevHooks(scene)

  const hooks: DevHooks = {
    challenge: () => {
      // Reproduces the real sequence — talking to the Elder completes Quest 1,
      // and accepting his quest opens the challenge — so the prerequisite
      // chain is exercised rather than bypassed.
      QuestManager.completeQuest('speak-with-elder')
      QuestManager.startQuest('array-sorting-challenge')
      scene.openChallenge()
    },
    teleport: ((event: CustomEvent<{ tileX: number; tileY: number }>) => {
      const { tileX, tileY } = event.detail
      if (!Number.isFinite(tileX) || !Number.isFinite(tileY)) return
      scene.devTeleportToTile(tileX, tileY)
    }) as EventListener,
  }

  window.addEventListener('dsa:open-challenge', hooks.challenge)
  window.addEventListener('dsa:teleport', hooks.teleport)
  hooksByScene.set(scene, hooks)

  // Scene restart/shutdown must not leak listeners onto `window`.
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => removeDevHooks(scene))
  scene.events.once(Phaser.Scenes.Events.DESTROY, () => removeDevHooks(scene))
}
