import { describe, expect, it } from 'vitest'

/**
 * Production-bundle regression guard for the dev-only hooks.
 *
 * The `dsa:open-challenge` / `dsa:teleport` listeners live in
 * `src/game/scenes/devHooks.ts`, reached ONLY through a dynamic import guarded
 * by `import.meta.env.DEV` in `MainScene.create()`. Vite replaces that flag
 * with `false` in production builds and folds the branch away, so the
 * devHooks module (which has no other importer) is fully tree-shaken from the
 * shipped JavaScript — including the `dsa:*` string literals.
 *
 * These assertions lock down the structural guarantees:
 *
 * 1. the scene's only registration path is the guarded dynamic import;
 * 2. hook registration and removal are paired through a per-scene record, so
 *    a restarted scene replaces (never stacks) its window listeners;
 * 3. listeners are torn down on scene SHUTDOWN/DESTROY;
 * 4. the devHooks module has no static importer that would drag it into the
 *    production chunk.
 */
describe('dev-only scene hooks gating', () => {
  it('registers dev hooks only via the guarded dynamic import in MainScene', async () => {
    const mod = (await import('../scenes/MainScene?raw')) as unknown as {
      default: string
    }
    const code = mod.default
    // The single registration path, behind the static dev flag.
    expect(code).toMatch(
      /if \(import\.meta\.env\.DEV\) \{\s*\n\s*import\('\.\/devHooks'\)/,
    )
    // No unconditional/synchronous import of the devHooks module.
    expect(code).not.toMatch(/^import .*devHooks/m)
    // No leftover in-class listener registration.
    expect(code).not.toContain("addEventListener('dsa:teleport'")
    expect(code).not.toContain("addEventListener('dsa:open-challenge'")
  })

  it('pairs registration with removal so restarts cannot stack listeners', async () => {
    const hooks = (await import('../scenes/devHooks?raw')) as unknown as {
      default: string
    }
    const code = hooks.default
    // registerDevHooks first clears any previous pair (WeakMap-keyed).
    expect(code).toMatch(/export function registerDevHooks/)
    expect(code).toMatch(/removeDevHooks\(scene\)/)
    expect(code).toMatch(/removeEventListener\('dsa:open-challenge'/)
    expect(code).toMatch(/removeEventListener\('dsa:teleport'/)
    // Listeners must be torn down on scene shutdown/destroy.
    expect(code).toMatch(/SHUTDOWN, \(\) => removeDevHooks\(scene\)/)
    expect(code).toMatch(/DESTROY, \(\) => removeDevHooks\(scene\)/)
  })

  it('devHooks has no static importer that would pull it into production', async () => {
    const mainScene = (await import('../scenes/MainScene?raw')) as unknown as {
      default: string
    }
    // Any static `import ... from './devHooks'` in MainScene would defeat the
    // guarded dynamic import and keep the module in the production chunk.
    expect(mainScene.default).not.toMatch(
      /^import\s+(?:\{[^}]*\}|\w+)\s+from\s+'(?:\.\/)?devHooks'/m,
    )
  })
  it('pauses Phaser controls for the implementation modal and restores them on close', async () => {
    const mainScene = (await import('../scenes/MainScene?raw')) as unknown as {
      default: string
    }
    const code = mainScene.default
    expect(code).toMatch(
      /closeImplementationChallenge\(\)\s*\{\s*QuestManager\.closeChallenge\(\)\s*this\.resumePlayerControls\(\)/,
    )
    expect(code).toMatch(
      /private resumePlayerControls\(\)\s*\{\s*if \(this\.input\.keyboard\) this\.input\.keyboard\.enabled = true\s*this\.isChallengeOpen = false\s*this\.releasePlayer\(\)/,
    )
  })

  it('routes the development challenge shortcut through the current Elder stage', async () => {
    const mainScene = (await import('../scenes/MainScene?raw')) as unknown as {
      default: string
    }
    const hooks = (await import('../scenes/devHooks?raw')) as unknown as {
      default: string
    }
    expect(hooks.default).toMatch(/scene\.openChallenge\(\)/)
    expect(mainScene.default).toMatch(
      /openChallenge\(\)\s*\{\s*const stage = readElderPrologueStage\([\s\S]*?this\.openElderLesson\(stage\)/,
    )
    expect(mainScene.default).not.toMatch(/openChallenge\(\)\s*\{\s*this\.closeDialogue\(\)\s*this\.openChallenge\('array-quiz'/)
  })

})
