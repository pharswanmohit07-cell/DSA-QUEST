# AGENTS.md — Coding Agent Instructions

These instructions apply to all AI coding assistants working in this repository.

## Project architecture

DSA Quest is a pixel-art browser RPG that teaches Data Structures and Algorithms to BCA/B.Tech students. It combines React (UI) with Phaser (world).

- **React**: owns the home screen, settings, stats panel, challenge modals, dialogue box rendering, quest tracker, and the opening manga viewer.
- **Phaser**: `src/game/scenes/MainScene.ts` drives the village world — player movement, collision, NPC interaction, gate behavior, camera, and map rendering.
- **GameWorld.tsx**: the React↔Phaser integration bridge. It mounts the Phaser canvas and wires React state to the scene. Protected.
- **QuestManager** (`src/game/quests/QuestManager.ts`): owns campaign progression, XP, side-quest state, and persistence. It reads/writes a versioned campaign save and exposes a React-facing snapshot via an external store (`useQuestState()`).
- **Save migration** (`src/game/quests/saveMigration.ts`): validates and migrates V1/V2 saves to the current V3 (`CampaignSave`) format. When touching save shapes, extend the migration and its tests.
- **Challenge system** (`src/game/challenge/` + `src/game/quests/ChallengeModal.tsx`): array quiz with a three-heart attempt system, stack Push/Pop practice, and a JavaScript coding challenge (`sortArray(arr)`).
- **NPC and dialogue**: `src/game/npc/` (NPC sprites, wander AI, interaction prompt), `src/game/dialogue/` (dialogue store/controller). `villageNpcs.ts` holds the Elder's dialogue tree; Elder routing is in `elderCampaignRouting.ts`.
- **Player stats and profile**: `src/game/stats/playerStats.ts` and `StatsPanel.tsx` handle XP, levels, mastery grades, and topic progress.
- **Assets and map**: `src/assets/tiles/ninja-village/MAP.json` is the authored 35×35 tile map plus collision rects. Region rules live in `src/game/map/`.
- **Multiplayer/Supabase**: `src/game/multiplayer/` contains optional Supabase auth, guest access, and a realtime lobby. It is optional at runtime; the single-player game must work without it.

## Development rules

- Inspect existing patterns before changing code. Match the surrounding style and structure.
- Prefer focused, minimal changes. Do not refactor unrelated code.
- Preserve existing features and behavior unless the task explicitly asks for a change.
- Add or update tests for behavior changes (Vitest, `*.test.ts(x)`).
- Run validation: `npm test`, `npm run build`, `npm run lint`, `npm run check:village`.
- Do not invent metrics, fake features, or claim unverified implementation. Report only what the code and tests actually support.

## Protected systems

Treat these as protected unless the user explicitly authorizes changes:

- `src/assets/tiles/ninja-village/MAP.json`
- `src/game/GameWorld.tsx`
- Manga characters, artwork, story, panels, and dialogue (`src/game/story/`)
- Camera behavior
- Player movement and collision
- Gate behavior
- Existing HUD and interaction controls
- Audio, music, skins, and settings
- Existing touch and mobile code

Do not introduce new mobile layouts, breakpoints, touch enhancements, or mobile optimization in the current development phase. Preserve existing touch/mobile support untouched.

## Current development target

- Laptop/desktop PCs.
- Keyboard and mouse as primary inputs.
- Main target resolutions: 1366×768 and 1920×1080.

## Git safety

- Never commit, push, merge, or deploy without explicit user authorization.
- Never force-push.
- Never discard uncommitted work (no `git reset --hard`, no `git clean`).
- Never use `git add .` or `git add -A` blindly; stage files deliberately.
- Do not alter protected systems without approval.
