# DSA Quest Performance Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce cold and repeat startup delays, make first dialogue interactions responsive, and prevent ambient NPC work from creating long main-thread frames without changing existing gameplay or visuals.

**Architecture:** Add a shared, deduplicated village asset-preparation path that performs tileset extrusion in cooperative batches before Phaser starts. Prefetch the lightweight dialogue UI and isolate the remaining lazy overlays. Make player interaction input run before optional ambient work, and move ambient BFS into a fair scheduler with strict per-frame work limits and live safety checks.

**Tech Stack:** TypeScript, React 19, Phaser 4, Vite 8, Vitest 5, GitHub Actions, Vercel Preview.

## Global Constraints

- Work on branch `performance/cooperative-startup-frame-time`, based on PR #54 head `a1e1b64ac15b6945d8afa9cea433368a3c4bfaa0`.
- Do not modify or merge into production `main`, promote a deployment, change production environment variables, or alter DNS.
- Preserve camera, canvas and scale behavior, map/art, collision, player movement, keyboard and touch controls, NPC movement profiles/regions, dialogues, quests, relic flow, save/restore, login/account flow, and mobile controls.
- Do not add or remove multiplayer features.
- Do not hide performance issues by reducing NPC population or changing NPC routes/regions.
- No complete atlas extrusion or complete 6,000-node path search may execute as one unbounded synchronous task after gameplay starts.
- Keep asset warm-up cooperative, deduplicated, recoverable, and paused/reduced while the tab is hidden.
- Use Vercel Preview first. Render may be used only as a preview fallback if Vercel is blocked; never change production traffic.
- No external analytics or personal data collection. Performance diagnostics must be development/preview gated and must not create noisy production logs.
- Do not claim universal 60 FPS or “instant” performance. Compare before/after measurements on the same environment and report p50/p95 only when sample counts support them.
- Required repository checks: `npm run build`, `npm run lint`, `npm run check:village`, and the full Vitest suite (`npx vitest run`; `npm test` also runs the build first).

---

### Task 1: Add preview-only performance diagnostics and capture the baseline

**Files:**
- Create: `src/game/performance/performanceDiagnostics.ts`
- Create: `src/game/performance/performanceDiagnostics.test.ts`
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/game/GameWorld.tsx`
- Modify: `src/game/GameLoadingOverlay.tsx`
- Modify: `src/game/scenes/MainScene.ts`

**Interfaces:**
- Produces `markPerformance(name: PerformanceMarkName): void`, `measurePerformance(name: string, start: PerformanceMarkName, end: PerformanceMarkName): number | null`, and `recordFrame(deltaMs: number): void`.
- Diagnostics are enabled only when `import.meta.env.DEV` or the explicit preview flag `VITE_ENABLE_PREVIEW_PERFORMANCE_DIAGNOSTICS === 'true'` is set.
- Performance event names cover home render, start requested, asset preparation start/end, Phaser boot, scene create start/end, world ready, first interaction received, dialogue module ready/mounted, extrusion batch duration, pathfinding work, and long frames.

- [ ] **Step 1: Add focused failing tests**

Test that disabled diagnostics do not call `performance.mark`/measure or log; enabled diagnostics create named marks/measures; frame samples are bounded and summarized without storing player/account data; invalid or missing marks return `null` rather than throwing.

- [ ] **Step 2: Verify the relevant failure**

Run: `npx vitest run src/game/performance/performanceDiagnostics.test.ts`

Expected: tests fail because the diagnostics module and API do not exist.

- [ ] **Step 3: Implement diagnostics and instrumentation**

Add the gated diagnostics module. Mark home/menu render, start request, asset preparation, Phaser boot, scene creation, world-ready and first interaction. Record dialogue readiness/mount and path-search/extrusion batch duration in later tasks. Keep all metrics local to the page session; never transmit them to a server. Add a preview-only summary output rather than a per-frame log.

- [ ] **Step 4: Verify the focused pass**

Run: `npx vitest run src/game/performance/performanceDiagnostics.test.ts`

Expected: all diagnostics tests pass, including disabled-mode no-op behavior.

- [ ] **Step 5: Run affected integration checks**

Run: `npm run build`

Expected: TypeScript and Vite build complete, with diagnostics disabled by default in production.

- [ ] **Step 6: Commit the passing deliverable**

Commit only the diagnostics module, its tests, and the listed instrumentation edits with message `perf: add preview performance diagnostics`.

### Task 2: Prepare village tilesets cooperatively before Phaser scene creation

**Files:**
- Create: `src/game/map/villageTilesetCache.ts`
- Create: `src/game/map/villageTilesetCache.test.ts`
- Modify: `src/game/scenes/MainScene.ts`
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/game/GameWorld.tsx`
- Modify: `src/game/GameLoadingOverlay.tsx`

**Interfaces:**
- Produces `prepareVillageTilesets(options?: { onProgress?: (progress: number) => void }): Promise<void>`, `getPreparedTileset(cacheKey: string): HTMLCanvasElement | undefined`, and a deterministic cache-key builder shared by the preparation service and `MainScene`.
- The preparation promise is shared across HomeScreen background warming and GameWorld launch; simultaneous callers do not duplicate image loads or extrusion.
- The service reports essential preparation progress and waits for the browser to resume when the document is hidden.

- [ ] **Step 1: Add focused failing tests**

Test cache-key stability; that tile extrusion preserves atlas dimensions, tile order, transparent-edge fill, and the existing ground-tile rule; that cooperative batches yield between bounded groups; that concurrent preparation calls share a single promise; that a rejected image/preparation can be retried; and that hidden-tab work pauses and resumes without leaving the promise unresolved.

- [ ] **Step 2: Verify the relevant failure**

Run: `npx vitest run src/game/map/villageTilesetCache.test.ts`

Expected: tests fail because the shared cooperative cache service does not exist.

- [ ] **Step 3: Implement the preparation service**

Move the extrusion/cache responsibility out of the scene module into `villageTilesetCache.ts`. Process a bounded number of tiles or a small time slice at a time, yield through `requestIdleCallback` when available and a `requestAnimationFrame`/task fallback otherwise, and stop the slice when its budget is exhausted. Check `document.visibilityState` between slices and resume on `visibilitychange`. Preserve the existing extrusion algorithm and cache-key inputs. Keep progress monotonic from 0 to 1.

Update HomeScreen to start this work in the background without blocking its first paint. Update GameWorld to await the same preparation promise before constructing `Phaser.Game`, while the loading overlay remains visible and reports progress. In MainScene, use only the prepared canvas cache; remove the surprise full-atlas synchronous fallback. If required preparation fails, dispatch the existing `dsaq:world-error` path and keep the user able to return to the menu rather than creating a partially initialized world.

- [ ] **Step 4: Verify the focused pass**

Run: `npx vitest run src/game/map/villageTilesetCache.test.ts`

Expected: all cache, output-equivalence, batching, deduplication, retry and visibility tests pass.

- [ ] **Step 5: Run affected integration checks**

Run: `npm run build && npx vitest run src/game/map/villageTilesetCache.test.ts src/game/scenes`

Expected: TypeScript/Vite build and scene/map-focused tests pass; the scene has no synchronous miss path that performs full atlas extrusion.

- [ ] **Step 6: Commit the passing deliverable**

Commit only the new service, focused tests and integration files with message `perf: time-slice village asset preparation`.

### Task 3: Make first dialogue ready and isolate lazy overlay loading

**Files:**
- Create: `src/game/GameOverlayFallback.tsx`
- Create: `src/game/GameOverlayFallback.test.tsx`
- Create: `src/game/GameWorld.loading.test.tsx`
- Modify: `src/game/GameWorld.tsx`

**Interfaces:**
- Produces a small reusable fallback component accepting a label and optional compact layout mode; it must be accessible via `role="status"` and `aria-live="polite"`.
- Dialogue remains the first ready overlay. Challenge, reward, settings and touch-control bundles remain lazy and have independent Suspense boundaries.

- [ ] **Step 1: Add focused failing tests**

Test the fallback's accessible status text. In `GameWorld.loading.test.tsx`, mock the lazy dialogue and challenge modules with independently controlled promises; assert a pending challenge does not replace/suspend the dialogue boundary and dialogue prefetch is requested during game startup before the first interaction event.

- [ ] **Step 2: Verify the relevant failure**

Run: `npx vitest run src/game/GameOverlayFallback.test.tsx`

Expected: tests fail because the local fallback and independent loading boundaries do not exist.

- [ ] **Step 3: Implement targeted UI loading**

Prefetch only `DialogueBox` during the GameWorld startup/loading window. Keep challenge and reward components lazy until their own state becomes active. Split the single shared `<Suspense fallback={null}>` into local boundaries so an unrequested or delayed challenge/reward chunk cannot blank the dialogue or other overlays. Preserve all existing props, event handlers, quest state subscriptions, and Phaser-to-React event contracts.

- [ ] **Step 4: Verify the focused pass**

Run: `npx vitest run src/game/GameOverlayFallback.test.tsx`

Expected: fallback accessibility, independent boundary and dialogue-prefetch tests pass.

- [ ] **Step 5: Run affected integration checks**

Run: `npm run build && npx vitest run src/game`

Expected: all game UI and game logic tests pass; challenge, reward and settings components remain code-split.

- [ ] **Step 6: Commit the passing deliverable**

Commit the fallback, tests and GameWorld changes with message `perf: preload dialogue and isolate game overlays`.

### Task 4: Prioritize player input and schedule ambient BFS within a strict frame budget

**Files:**
- Create: `src/game/npc/pathSearchScheduler.ts`
- Create: `src/game/npc/pathSearchScheduler.test.ts`
- Modify: `src/game/npc/mapRoamAi.ts`
- Modify: `src/game/npc/mapRoamAi.test.ts`
- Modify: `src/game/scenes/MainScene.ts`

**Interfaces:**
- Produces `PathSearchTask` with `hasPendingSearch: boolean` and `advance(maxNodes: number): number`, plus `advanceSearchesRoundRobin(tasks, nodeBudget, startIndex)` returning processed-node count and the next stable start index.
- `MapRoamAi` exposes pending-search state and incremental advancement; its normal `update(npc, deltaMs, now, paused)` continues to own dwell, movement, pause and resume state.
- Scene-level limits start at a maximum of 256 BFS node expansions per frame, with at most 32 expansions per task slice and a 2 ms wall-clock guard; keep these as named constants and tune only from measurements.

- [ ] **Step 1: Add focused failing tests**

Scheduler tests assert the total node budget is never exceeded, a single search cannot consume the whole frame when multiple searches are pending, the start cursor rotates fairly, completed tasks are skipped, empty task lists are safe, and a task that returns zero work cannot cause an infinite loop. MapRoamAi tests assert a search can pause between batches and complete to the same valid destination/path as the synchronous reference; dynamic occupied tiles are checked while expanding and again immediately before each movement step; changes in gate state and region restrictions remain respected; maximum-search exhaustion ends safely and can retry later.

- [ ] **Step 2: Verify the relevant failure**

Run: `npx vitest run src/game/npc/pathSearchScheduler.test.ts src/game/npc/mapRoamAi.test.ts`

Expected: scheduler tests fail because no cooperative scheduling interface exists; new incremental MapRoamAi tests fail because flood fill currently runs synchronously.

- [ ] **Step 3: Implement fair bounded search and input ordering**

Convert flood fill into resumable BFS state (queue, head index, parent map, start tile and completion state). Each scheduled slice processes at most its assigned number of expansions and returns promptly. Keep the live walkability, region and occupancy callbacks. Before consuming a path step, revalidate its walkability and occupancy; cancel and re-plan when a new blocker occupies that step. Preserve injected random source behavior when selecting a destination after the search completes.

Add round-robin advancement across active map-roaming NPCs with one shared per-frame work cap and wall-clock guard. Keep NPC movement updates for all active residents, but do not let one route search monopolize the frame. In MainScene, refresh visible NPC membership and calculate the nearby interactable NPC first; process latched E/Space/exit input next; run ambient AI, cosmetic prompts, name-tag updates and other non-essential work afterwards. Ensure input consumes its latch exactly once and rechecks NPC validity before opening dialogue. Keep touch interaction and the existing challenge/dialogue locks intact.

- [ ] **Step 4: Verify the focused pass**

Run: `npx vitest run src/game/npc/pathSearchScheduler.test.ts src/game/npc/mapRoamAi.test.ts src/game/npc/regionalRoaming.test.ts`

Expected: scheduler, incremental BFS, region safety, live occupancy, gate transition, pause/resume and movement tests all pass.

- [ ] **Step 5: Run affected integration checks**

Run: `npm run build && npx vitest run src/game/npc src/game/scenes`

Expected: no type, pathfinding, scene or regression test failures; E/Space priority and touch input integration remain correct.

- [ ] **Step 6: Commit the passing deliverable**

Commit the scheduler, MapRoamAi, tests and MainScene integration with message `perf: bound ambient NPC pathfinding and prioritize input`.

### Task 5: Full regression verification, preview measurements and release evidence

**Files:**
- Modify only if measured: `src/game/playerNameTag.ts`
- Modify only if measured: `src/game/performance/performanceDiagnostics.ts`
- Modify: `docs/plans/2026-11-21-cooperative-startup-frame-time.md` with verified results and any tuning values.
- No production files or production configuration are in scope.

**Interfaces:**
- Consumes the diagnostics marks and summaries from Task 1, asset progress from Task 2, dialogue readiness from Task 3 and path-work metrics from Task 4.
- Produces a PR evidence summary with commit SHA, CI run, preview URL, test matrix, cold/warm time-to-play, first-interaction readiness and frame/pathfinding measurements.

- [ ] **Step 1: Add or refine focused regression tests**

Add a regression only for a concrete issue observed in verification. Profile active-NPC name-tag work; do not alter tag update frequency unless the measurements show it is material and the existing proximity fade/visibility tests can protect behavior.

- [ ] **Step 2: Verify the focused failure when needed**

Run: the focused test for the specific measured regression before changing behavior.

Expected: a reproducible failing assertion or recorded profile demonstrates the issue; do not introduce speculative throttling.

- [ ] **Step 3: Apply only evidence-backed refinements**

Tune the named extrusion/pathfinding budgets if measurements show they are too high or too low. Preserve the map, NPC behavior and visuals. Document any change in the implementation plan's verification record.

- [ ] **Step 4: Run every repository gate**

Run:
`npm run build`
`npm run lint`
`npm run check:village`
`npx vitest run`
`npm run test:prod-bundle`

Expected: all commands exit successfully; the production bundle does not include preview-only diagnostics or test helpers.

- [ ] **Step 5: Deploy and smoke-test preview**

Use Vercel Preview for the performance branch with the diagnostics flag enabled only for that preview branch. Verify the deployment commit matches the tested GitHub head. Smoke-test new game and continue game, first E/Space dialogue, repeated dialogue open/close, multiple ambient NPCs roaming, gate locked/unlocked pathing, challenge entry/exit, pause/settings and save/restore, tab hide/show during warm-up, and mobile touch movement/interact. Record cold and warm results on the same browser/device and compare them to the pre-change baseline. If Vercel cannot produce a usable preview due to a platform blocker, deploy the same verified static Vite build to a separate Render preview service; do not redirect the production domain.

- [ ] **Step 6: Commit the verification record**

Commit only verified measurements, PR evidence and any evidence-backed tuning with message `test: record DSA Quest performance verification`. Keep the branch as a reviewable preview PR; do not merge or promote to production.

## Unresolved external dependency

A genuine cold-cache and warm-cache browser run must use the same real browser/device before and after. CI can prove correctness and build integrity, but it cannot prove the player's actual frame rate or time-to-play on their machine. The preview diagnostics will expose the needed measurements; a browser session on the target device is required before claiming those performance gains.
