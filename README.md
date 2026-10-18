# DSA Quest

DSA Quest is a pixel-art RPG for practicing data structures and algorithms through village exploration, dialogue, quests, and coding challenges. The frontend uses React and TypeScript; Phaser runs the game world.

## Requirements

- Node.js compatible with the Vite version in `package.json`
- npm

## Development

```bash
npm ci
npm run dev
```

## Checks

```bash
npm run build
npm run lint
npm run check:village
```

- `build` runs TypeScript project checks and creates the Vite production bundle.
- `lint` runs Oxlint.
- `check:village` verifies tile collision and walk-behind rules, prints local ASCII grids, and checks known movement paths. It may report an existing alternate route around the back fence as a warning; this checker does not modify the map.

## Project structure

- `src/screens/`: home screen and user settings
- `src/game/scenes/MainScene.ts`: Phaser world, physics, camera, interactions, and map-layer behavior
- `src/game/quests/`, `src/game/challenge/`, `src/game/dialogue/`, `src/game/npc/`: game systems
- `src/game/map/`: tile IDs, collision exceptions, layer names, and quest gate rules
- `src/assets/tiles/ninja-village/MAP.json`: authored Tiled map data
- `scripts/check-village-rules.mjs`: collision-rule verification utility

## Controls

Use WASD or the arrow keys to move. Press E to interact. Touch controls are shown on supported mobile devices.

## Deployment

The project is configured for Vercel. Pushes to `main` trigger production deployment according to the repository's Vercel project settings.
