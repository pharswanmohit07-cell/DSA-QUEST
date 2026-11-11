import { describe, expect, it } from 'vitest'

/**
 * Production-bundle regression guard for the dev-only hooks.
 *
 * The `dsa:open-challenge` / `dsa:teleport` listeners live in
 * `src/game/scenes/devHooks.ts`, reached ONLY through a dynamic import guarded
 * by `import.meta.env.DEV` in `MainScene.create()`. Vite replaces that flag
 * with `false` in production builds and folds the branch away, so the
 * devHooks module (which has no other importer) is fully tree-shaken from the
 * shipped JavaScript â€” including the `dsa:*` string literals.
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
    // No unconditional/synchronous import of the devHooks modu¶»§q«^