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
 * importer) is dead-code-eliminated: no `dsa:*` listener code â€” not even the
 * string literals â€” reaches the shipped JavaScript.
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
 * scene res¶»§q«^