# Ninja Adventure Assist Pack — DSA QUEST Upgrade Audit

## Scope

This audit uses the supplied Ninja Adventure - Asset Pack by Pixel-boy and AAA. The pack README states that the assets are released under CC0; attribution is optional but appreciated.

The full archive is intentionally not imported into the game. Only the files required for a feature should be copied into `src/assets` and loaded through the existing Phaser preload path.

## Implemented in this preview branch

### 1. Pixel-aligned camera zoom

`MainScene` now rounds the camera cover zoom up to the next integer. The existing tile extrusion and nearest-neighbor filtering remain unchanged. This reduces fractional WebGL sampling at wide viewport sizes, which is a common cause of tiny dark seams between adjacent pixel-art tiles.

### 2. Ambient leaf motion

The pack's `FX/Particle/Leaf.png` strip is loaded as a six-frame 12x7 animation. Five lightweight world-space leaf sprites drift slowly across the starting village area. They have no physics body, collision, input handler, or quest dependency.

### 3. Ambient spark motion

The pack's `FX/Particle/Spark.png` strip is loaded as a seven-frame 10x8 animation. Four low-opacity spark sprites gently appear and fade near the starting village area to add life without changing map geometry or gameplay rules.

### 4. Full-map environment pass

The preview now distributes leaf and spark motion over safe ground candidates across the complete 35x35 map instead of clustering the effects near the initial spawn. The pack's `Backgrounds/Animated/Plant/SpriteSheet16x16.png` adds a small set of gently animated plants, while `Backgrounds/Animated/Water Ripples/SpriteSheet16x16.png` animates every existing lake-water cell identified by the current ground layer. No tile data is moved or rewritten; the effects are render-only sprites.

## Recommended future additions

### High-value environmental polish

- `Backgrounds/Animated/Water Ripples/SpriteSheet16x16.png`: animate existing water surfaces only after confirming the exact water tile positions. Keep it decorative and avoid changing the existing lake collision rules.
- `Backgrounds/Animated/Flower/SpriteSheet16x16.png` and `Plant/SpriteSheet16x16.png`: add small animated flowers or plants to already-walkable decorative cells. Do not place them over collision footprints.
- `Backgrounds/Animated/Flag/`: add regional flags near quest locations to improve navigation without moving NPCs.
- `Backgrounds/Animated/MillPropeller/` and `WaterMill/`: reserve for a future village landmark or minigame prop; these should be placed only after a map location is approved.
- `FX/Environment/Raylight.png` and `Fog.png`: use sparingly for dungeon or shrine atmosphere, with low opacity and a performance toggle for mobile devices.

### Gameplay and minigame assets

- `Backgrounds/Animated/Conveyor Belt/`: strong fit for the Sorting Factory minigame.
- `Items/Scroll/`: topic-specific objects for the Stack Dojo challenge.
- `Items/Object/Book.png`: already used by the preview Codex reward; extend the Codex to the seven campaign relics rather than adding unrelated inventory clutter.
- `Items/Object/CrateEmpty.png`, `Bag.png`, `Hourglass.png`, and `MoneyBag.png`: useful for Queue and Searching challenge states.
- `Items/Resource/Gem*.png` and `Items/Treasure/*`: visual relic and completion rewards, with one consistent reward language.
- `Ui/Dialog/ChoiceBox.png` and `Ui/Input/`: selected feedback assets for topic-specific challenge prompts, while preserving the established UI structure.

### Audio opportunities

- `Audio/Sounds/Ambient/Bird.wav`, `Wind.wav`, `River.wav`, and `Wave.wav`: add short, low-volume regional ambience through the existing audio manager rather than creating independent looping `Audio` objects.
- `Audio/Jingles/Success*.wav` and `LevelUp*.wav`: use for validated topic completion only, so rewards remain meaningful.
- `Audio/Sounds/Menu/Accept.wav` and `Cancel.wav`: useful for menu feedback if the current audio settings path can route them through master volume.

## Guardrails

- Do not change the 35x35 map geometry, collision layers, player controls, NPC population, quest IDs, or campaign reward authority for visual-only additions.
- Validate every spritesheet's frame dimensions from the original file before loading it.
- Keep decorative effects capped and disable or reduce them when reduced-motion or low-performance settings are enabled.
- Use `QuestManager` for rewards; pack items should not create a second inventory or progression system.
- Add each future asset family in a separate preview change so visual regressions can be isolated.

## Source

- Ninja Adventure Asset Pack README: CC0 license, created by Pixel-boy and AAA.
- Selected files: `FX/Particle/Leaf.png`, `FX/Particle/Spark.png`.
