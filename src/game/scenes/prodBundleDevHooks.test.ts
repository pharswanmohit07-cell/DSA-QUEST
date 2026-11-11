import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

/**
 * Automated production-bundle assertion for the dev-only teleport hook.
 *
 * `npm test` builds production output before Vitest runs. This assertion is
 * deliberately non-skippable: an absent or empty dist/assets directory is a
 * validation failure, not a successful bundle verification.
 */
describe('production bundle excludes dev-only hooks', () => {
  const distAssets = resolve(here, '../../../dist/assets')

  it('ships no dsa:* listener code in the freshly built production bundle', () => {
    expect(existsSync(distAssets), 'npm test must build dist/assets before checking the production bundle').toBe(true)
    const jsFiles = readdirSync(distAssets).filter((f) => f.endsWith('.js'))
    expect(jsFiles.length).toBeGreaterThan(0)
    for (const file of jsFiles) {
      const code = readFileSync(resolve(distAssets, file), 'utf8')
      expect(code, `${file} must not contain the dsa:teleport listener`)
        .not.toContain('dsa:teleport')
      expect(code, `${file} must not contain the dsa:open-challenge listener`)
        .not.toContain('dsa:open-challenge')
      expect(code, `${file} must not contain devHooks registration code`)
        .not.toContain('registerDevHooks')
    }
  })
})
