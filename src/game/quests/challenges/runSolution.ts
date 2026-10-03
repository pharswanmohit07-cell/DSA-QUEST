import type { ChallengeCaseResult } from '../questTypes'

/**
 * Runs player-submitted code safely and returns its test results.
 *
 * The submitted function is compiled with `new Function`, which gives the code
 * no access to this module's scope. Every call is wrapped so a thrown error or
 * a non-array return is reported as a failed test rather than escaping into the
 * render loop.
 *
 * What this does NOT stop: an infinite loop. The `TIME_BUDGET_MS` check runs
 * *after* the cases finish, so it can only flag slow code, not hanging code - a
 * genuinely stuck loop still freezes the tab. A truly untrusted deployment
 * needs a Web Worker or a separate sandboxed realm; this is enough for a local
 * single-player game where the "attacker" is the player's own typo.
 */

export type RunOutcome =
  | { ok: true; cases: ChallengeCaseResult[] }
  | { ok: false; error: string }

/**
 * Wall-clock ceiling for compiling plus running every case. Reported as a hint
 * when exceeded; see the note in this file's doc comment about what this does
 * and does not prevent.
 */
const TIME_BUDGET_MS = 750

export function runSolution(source: string, evaluate: (fn: unknown) => ChallengeCaseResult[]): RunOutcome {
  const started = Date.now()

  let fn: unknown
  try {
    // `new Function` compiles in global scope: no imports, no closure over this
    // module's variables.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    fn = new Function(`${source}; return typeof sortArray === 'function' ? sortArray : null;`)()
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Could not compile your solution.',
    }
  }

  if (typeof fn !== 'function') {
    return {
      ok: false,
      error: 'Define a function named sortArray(arr) and make sure it is a top-level declaration.',
    }
  }

  try {
    const cases = evaluate(fn)
    if (Date.now() - started > TIME_BUDGET_MS) {
      return {
        ok: false,
        error: 'Your solution took too long to run. Check for an infinite loop.',
      }
    }
    return { ok: true, cases }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Your solution threw an unexpected error.',
    }
  }
}
