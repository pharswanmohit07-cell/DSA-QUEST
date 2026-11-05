# DSA Quest — Project Context for AI Assistants

This is the handoff document for a new AI coding assistant (or human developer) taking over DSA Quest. It describes what is actually implemented, what is planned, and the rules that must be respected. Read `AGENTS.md` first for the short version of the working rules.

Status labels used below:

- **Implemented and verified** — backed by merged source code and automated tests.
- **Implemented, needs manual QA** — code merged, but no automated test or human playthrough confirms the in-game experience.
- **Planned/deferred** — designed but not implemented.
- **Known limitation** — accepted constraint of the current build.

## 1. Project overview and learning purpose

DSA Quest is a pixel-art browser RPG that helps BCA and B.Tech students learn Data Structures and Algorithms through exploration, dialogue, quests, and interactive challenges. It combines a React UI with a Phaser-powered village world. Players explore a fixed village map, talk to the Elder, learn array concepts, take a quiz, practice stack operations, and solve a JavaScript sorting exercise. **Production URL:** <https://dsa-quest-delta.vercel.app> (use it to see the deployed game; local development runs via `npm run dev`).

## 2. Actual implemented features

**Implemented and verified** (source + tests on `main`):

- Village exploration with authored 35×35 tile map, player movement, collision, NPC interaction prompts, and a quest gate (`src/game/scenes/MainScene.ts`, `src/game/map/`).
- Elder NPC with a dialogue tree, walk/wander AI, and interaction prompt (`src/game/npc/`).
- Array quiz with a three-heart attempt system (`src/game/challenge/`).
- Stack Push/Pop practice demonstrating LIFO (`src/game/challenge/`).
- JavaScript coding challenge: player writes `sortArray(arr)` and runs it against test cases (`src/game/quests/challenges/`).
- Player progression: XP, levels, profile, character skins, topic progress display (`src/game/stats/playerStats.ts`, `src/screens/StatsPanel.tsx`).
- Versioned browser save with migration from legacy formats (`src/game/quests/saveMigration.ts`).
- Campaign progression foundation: seven topics, prerequisite checks, attempt/hint tracking, mastery grades, relic entitlements, first-completion reward claims (`src/game/quests/campaignDefinitions.ts`, `campaignRules.test.ts`, `masteryGrading.ts`).
- Northern Scouting Trip optional side quest with one-time 25 XP reward (`src/game/quests/questTypes.ts`, `QuestManager.ts`).
- Optional quest tracker UI (`src/game/quests/QuestTracker.tsx`).
- Optional Supabase multiplayer: auth, guest access, realtime lobby with presence/chat/positions (`src/game/multiplayer/`).
- Opening manga viewer, in-game settings, audio with volume controls.

**Implemented, needs manual QA:**

- The Northern Scouting Trip end-to-end in-game flow (accept → enter snowfield → report → reward). Unit tests cover the state transitions and trigger logic, but a human should play the flow at 1366×768 and 1920×1080.
- Multiplayer lobby behavior against a live Supabase instance.

## 3. Current playable learning path

1. Home screen → start game → (first run) opening manga.
2. Talk to the Elder near the shrine → array lesson dialogue.
3. Complete the Array quiz (three hearts) at the challenge gate.
4. Practice Stack Push/Pop.
5. After the combined Array/Stack progression is complete, the Elder offers the **Northern Scouting Trip** side quest.
6. Accept, walk beyond the torii into the northern snowfield, return and report to the Elder for **25 XP, awarded once**.

The JavaScript sorting exercise is reachable as a separate challenge; it is **not** the campaign's Sorting topic.

## 4. Seven-topic campaign foundation — real status

The campaign model defines seven sequential topics: Arrays, Stack Operations, Queues, Linked Lists, Searching, Sorting, Trees. The foundation (topic definitions, prerequisite checks, progress tracking, mastery grades, relic entitlements, reward claims) is implemented and tested.

**Known limitation:** only the Arrays topic is a complete playable lesson path; Stack practice exists as a hands-on challenge. Queues, Linked Lists, Searching, Sorting, and Trees are **planned/deferred** — no playable quest lines exist for them yet. Never claim the campaign is fully playable.

## 5. Northern Scouting Trip flow and reward

- Offered by the Elder only when `getElderInteractionRoute` returns `quest-done` (legacy challenge complete or Stack topic complete) — `src/game/quests/elderCampaignRouting.ts`.
- Dialogue states: not started (offer/“Not now”), active-snowfield-unvisited, active-snowfield-visited (report → complete).
- Entering the bounded northern snowfield trigger area marks the visit (`src/game/quests/northernSnowfieldTrigger.ts`).
- Completion is a single transaction: persists completed status, `rewardClaimed=true`, and exactly +25 XP in one save write. Persistence failure returns a typed result (`persistence-failed` / `recovery-required`) so no UI claims success unless the save is confirmed.
- Independent progress/reward state; not a campaign topic; grants no relic or mastery grade.

## 6. Save system and V3 migration

- Current format: `CampaignSave` (V3) in `src/game/quests/questTypes.ts`; persisted in `localStorage`.
- `saveMigration.ts` validates V1/V2/V3 and migrates legacy saves to V3. Side-quest state is normalized at the manager's save-loading boundary so all consumers (scene, profile, home screen, quest tracker) see one runtime state.
- `QuestManager.getSave()` reads V3 first and migrates when needed; `restore()` publishes the loaded state. `useQuestState()` is the React-facing external-store snapshot.
- When changing save shapes, extend both `saveMigration.ts` and its tests (`saveMigration.test.ts`, `campaignV3Migration.test.ts`).
- **Known limitation:** `localStorage` has no cross-tab transaction; multi-tab concurrency is unsupported.

## 7. Mastery grading and profile statistics

`src/game/quests/masteryGrading.ts` computes per-topic mastery grades from quiz attempts, hints, and completion; `playerStats.ts` aggregates XP, levels, and topic progress for the profile/stats panel (`StatsPanel.tsx`). Tests: `masteryGrading.test.ts`, `playerStats.test.ts`.

## 8. Elder, NPC, dialogue, and trigger architecture

- `villageNpcs.ts` holds the Elder's `DialogueTree` (nodes, choices, effects).
- `elderCampaignRouting.ts` is a pure routing helper deciding which Elder dialogue branch runs.
- `MainScene.beginDialogue` / `chooseDialogueNode` / `runDialogueEffects` dispatch scene-owned node effects.
- Generic NPC machinery: `src/game/npc/Npc.ts`, `WanderAi.ts`, `InteractionPrompt.ts`.

## 9. React/Phaser integration

`src/game/GameWorld.tsx` mounts the Phaser canvas and is the only bridge between React state and the scene. It is **protected**. React subscribes to quest state through `useQuestState()`; the scene pushes changes through the QuestManager.

## 10. Technology stack (verified from package.json)

- React `^19.2.8`, React DOM `^19.2.8`, Phaser `^4.2.1`
- Vite `^8.3.0`, TypeScript `~6.0.2`, Vitest `^5.1.0`, jsdom `^30.1.3`, oxlint `^1.81.0`, `@vitejs/plugin-react` `^6.1.1`
- Node-based validation scripts in `scripts/` (plain `.mjs`, no extra runtime deps required for the published checkers)

## 11. Repository structure and important source files

```
src/
  App.tsx, main.tsx                 # app shell
  screens/                          # HomeScreen, SettingsScreen, StatsPanel
  game/
    GameWorld.tsx                   # React↔Phaser bridge (protected)
    scenes/MainScene.ts             # village world, movement, collision, NPC, gate
    quests/                         # QuestManager, questTypes, saveMigration,
                                    # campaignDefinitions, masteryGrading,
                                    # elderCampaignRouting, northernSnowfieldTrigger,
                                    # QuestTracker, ChallengeModal, challenges/
    challenge/                      # array quiz, stack practice, question bank
    npc/ dialogue/ map/ stats/      # NPCs, dialogue, region rules, player stats
    multiplayer/                    # optional Supabase auth + realtime lobby
    story/                          # opening manga (protected content)
    audio/ player/                  # audio, skins, speed settings
  assets/tiles/ninja-village/       # MAP.json (35×35 authored map) + tilesets + Elder/Hunter sprites
  assets/UI/, assets/characters/    # dialog UI, character SVGs
docs/
  PROJECT_CONTEXT.md                # this file
  asset-library/ninja-adventure/    # asset-pack reference index (no binaries)
  specs/, plans/                    # design + implementation plan docs
scripts/                            # validation utilities (read-only checkers)
```

## 12. Local setup and environment configuration

```powershell
npm install        # or npm ci for a clean reproducible install
npm run dev        # Vite dev server
```

No environment variables are required for single-player play. Supabase multiplayer is optional; it reads its configuration at runtime and the game works fully without it. Do not commit `.env` files.

## 13. Test, build, lint, and village-check commands

```powershell
npm test              # Vitest run
npm run build         # tsc -b && vite build
npm run lint          # oxlint
npm run check:village # node scripts/check-village-rules.mjs (map/collision validation)
node scripts/check-upper-village-roofs.mjs   # upper-village roof/collision audit (read-only)
node scripts/verify-upper-roofs.mjs          # tile-id grid dump for upper village (read-only)
node scripts/find-overlay-cells.mjs          # list above-player overlay cells (read-only)
```

## 14. Multiplayer capabilities and limitations

Implemented: Supabase email auth, guest access, realtime lobby with room presence, chat, and player-position updates (`src/game/multiplayer/`). Limitations: optional at runtime — single-player must work without Supabase; the lobby does not implement co-op questing or shared world state; production credentials are configured outside the repository.

## 15. Known warnings and limitations

- Seven-topic campaign is a foundation, not seven playable quest lines (see §4).
- Northern Scouting Trip lacks end-to-end manual QA sign-off (see §2).
- `localStorage` saves are per-browser; no cross-device sync, no cross-tab locking.
- Multiplayer is optional and unverified against production load.
- Lint/typecheck may surface pre-existing warnings; document them rather than weakening rules. `npm run lint` (oxlint) currently reports 13 warnings and 0 errors.
- `scripts/check-upper-village-roofs.mjs` currently reports one failing check on `main`: the sand-road reachability test (0,6)→(18,6) is blocked by gid 1363 at (18,6). This is a pre-existing discrepancy between the script's expectations and the current merged map — it fails identically in older local workspaces, so it is not a regression. Do not "fix" it by editing MAP.json (protected) without user authorization.

## 16. Deferred work and future possibilities

- Playable quest lines for Queues, Linked Lists, Searching, Sorting, Trees.
- Relic art and shrine/restoration effects (see `docs/asset-library/ninja-adventure/` for candidate references; the pack is CC0).
- Deeper multiplayer features (shared quests, co-op exploration).
- Cross-device save sync.

## 17. Production vs local

- **Production:** <https://dsa-quest-delta.vercel.app> — deployed from `main`.
- **Local:** `npm run dev` on your machine; do not confuse local test saves/state with production data.

## 18. Branch/PR history

- **PR #39** (`feature/northern-snowfield-side-quest`) — merged into `main`. Implementation commit `0686c1057681284c1f22142ae23f72138e504a7e`, merge commit `e118c194d7add932522cb70dbf078eade39d4a00`. It delivered campaign progression, V3 save migration, mastery grading, Elder dialogue routing, the Northern Scouting Trip, the optional quest tracker, tests, the design spec, and the implementation plan. Do not recreate or revert it.
- Earlier history includes Phase 3 manga foundation, map/collision fixes, and village physics fixes on `main`.
- Documentation handoff work (this file, `AGENTS.md`, asset-library index, validation scripts) was added on `docs/ai-handoff-and-repository-inventory`.

## 19. Important rules for future AI coding assistants

See `AGENTS.md` for the authoritative list. Highlights:

- Inspect existing patterns first; make focused changes; preserve behavior.
- Add/update Vitest tests for behavior changes; run `npm test`, `npm run build`, `npm run lint`, `npm run check:village`.
- Protected systems (MAP.json, GameWorld.tsx, manga/story content, camera, movement/collision, gate, HUD, audio/skins/settings, touch code) require explicit user authorization to change.
- No new mobile layouts/touch enhancements in the current phase; targets are desktop 1366×768 and 1920×1080 with keyboard/mouse.
- Git safety: no commits/pushes/merges without explicit authorization; never force-push; never discard uncommitted work; never `git add .` blindly.
- Never invent metrics, features, or completion claims — report only what code and tests support.
