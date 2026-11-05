# Ninja Adventure Asset Pack – Inventory & DSA Quest Reuse Guide

**Archive inspected:** `Ninja Adventure - Asset Pack.zip`  
**Inspection type:** file inventory, metadata, representative visual previews and README/licence review. No files from the archive were executed and no game repository files were changed.

## Overview

- **Files:** 2,234 (plus 440 directory entries).
- **Uncompressed size:** 104.8 MiB.
- **Top-level asset distribution:**
  - `Actor`: 1,366 files
  - `Ui`: 361 files
  - `Audio`: 188 files
  - `Items`: 142 files
  - `FX`: 105 files
  - `Backgrounds`: 61 files
  - `Example 1.gif`: 1 files
  - `Example 2.gif`: 1 files
  - `Example 3.gif`: 1 files
  - `Example 4.gif`: 1 files
  - `Example 5 ( Old Version).png`: 1 files
  - `LICENSE.txt`: 1 files
  - `MusicCover.png`: 1 files
  - `Palette.png`: 1 files
  - `preview-part-1.png`: 1 files
  - `preview-part-2.png`: 1 files
  - `README.md`: 1 files

**File types:**
- `.png`: 1,915
- `.wav`: 147
- `.gif`: 128
- `.ogg`: 41
- `.txt`: 1
- `.md`: 1
- `.ttf`: 1

## Main contents

### `Actor/Character`
903 files; about 92 named character sets, excluding preview sheets and the shared shadow image. Includes `Hunter`, `OldMan`, `OldMan2`, `OldMan3`, `Monk`, `Monk2`, `Master`, `Shaman`, `Samurai`, `NinjaBlue`, `NinjaGreen`, `NinjaRed`, `NinjaYellow`, `Villager` variants, `Noble`, and many others.

### `Actor/CharacterAnimated`
29 files. Contains the enhanced `NinjaGreen` animated character set with separate actions and GIF previews, plus animated weapon sheets.

### `Actor/Animal`
117 files. Many animal variants with facesets and small sprite sheets.

### `Actor/Monster`
132 files. 66 monster folders/resources such as slimes, bats, spirits, cyclopes, dragons, bamboo creatures, snakes, spiders and others.

### `Actor/Boss`
185 files. 20 boss folders/resources, including Demon Cyclops, Giant Bamboo, Giant Samurai, Giant Slime, Giant Spirit, Tengu and dragon variants.

### `Backgrounds/Tilesets`
23 files. Includes village, abandoned-village, dungeon, desert, elemental, logic, tower, interior, floor, house, nature, relief and water sheets.

### `Backgrounds/Animated`
33 files. Animated plants, flowers, flags, waterfalls, water ripples, watermills, conveyor belt and quicksand.

### `Backgrounds/Vehicles`
5 files. Boat, crane, sail and fishing-net elements.

### `Items`
142 files. Weapons, food, objects, resources, scrolls, tools, potions, projectiles and treasure.

### `Ui`
361 files. Dialog components, theme panels/buttons, keyboard/gamepad/mouse prompts, emotes, skill icons, receptacles and bitmap/TTF fonts.

### `FX`
105 files. Attack, elemental, magic, particle, projectile, slash, smoke and environmental effects.

### `Audio`
188 files. 147 WAV files, 41 OGG files; includes sounds, music and jingles.

## Best-fit uses in DSA Quest

### 1. NPCs and guardians

- **Elder / wise mentor candidates:** `Actor/Character/OldMan/`, `OldMan2/`, `OldMan3/`. Keep the current Elder Hiro identity and dialogue consistent; do not swap his art without checking the existing game reference and animation compatibility.
- **Knowledge guardians / mentors:** `Monk/`, `Monk2/`, `Master/`, `Shaman/`, `ShamanLion/`, `Samurai/`, `SamuraiBlue/`, `SamuraiRed/`, `Noble/` and selected `Villager*` sets are promising visual candidates. These are suggestions, not assigned characters.
- **Player character options:** `Hunter/` and the various `Ninja*` folders can provide alternatives or references. Preserve the current selected player skins unless the design explicitly approves a change.
- **World population:** `Villager*`, `Woman/`, `Boy/`, `Child/`, `OldWoman/` and animal sets can add life later, where the fixed map has safe, non-blocking positions.

### 2. Relics and quest rewards

- Useful starting references: `Items/Resource/GemGreen.png`, `GemPurple.png`, `GemRed.png`, `GemYellow.png`; `Items/Treasure/GoldKey.png`, `GoldCup.png`, `LittleTreasureChest.png`, `BigTreasureChest.png`; `Items/Object/Book.png`; and `Items/Scroll/Scroll.png`.
- These can inspire seven relic icons or temporary rewards. Prefer distinct, clearly readable relic artwork rather than reusing one generic coin/chest for every knowledge topic.

### 3. Shrine / story effects

- `FX/Magic/Circle/`, `FX/Magic/Spark/`, `FX/Magic/Aura/`, `FX/Magic/Spirit/` and `FX/Environment/Fog.png` / `Raylight.png` are useful candidates for the seven-relic activation, the shrine restoration and the Algorithm Vault reveal.
- Keep effects subtle and pixel-aligned; use as visual feedback rather than adding combat systems that are outside the approved Phase 3 scope.

### 4. Dialogue and game UI

- `Ui/Dialog/` has dialog boxes, faceset frames, choice box and yes/no buttons.
- `Ui/Theme/Theme Wood/` contains button states, nine-patch panels, tabs, sliders, checkboxes and radio controls. Several WIP themes are also present.
- `Ui/Input/` has keyboard, mouse and gamepad button images; `Ui/Font/` contains `font8x8.png`, `font24x30.png` and `NormalFont.ttf`.
- Treat these as a visual resource library. The current DSA Quest menu, profile and settings designs are protected; do not replace those interfaces wholesale.

### 5. Audio

- Music candidates by filename for later in-game audition: `Audio/Musics/38 - Intro.ogg`, `4 - Village.ogg`, `33 - Calm Village.ogg`, `12 - Temple.ogg`, `13 - Mystical.ogg`, `26 - Lost Village.ogg`, `28 - Tension.ogg`, `30 - Ruins.ogg`, `8 - End Theme.ogg` and `15 - Credit Theme.ogg`.
- Jingle candidates: `Audio/Jingles/Success1.wav`–`Success4.wav`, `Secret1.wav`–`Secret4.wav` and `LevelUp1.wav`–`LevelUp3.wav`.
- These are filename-based suggestions only; listen to the tracks and compare them with existing DSA Quest audio before selecting them.

## Technical notes for integration

- The asset pack is a **pixel-art game asset library**, not a complete game project. It does not provide DSA Quest quest logic, NPC behaviour, save code, or a ready-made playable world for our project.
- Many standard `Actor/Character/*/SpriteSheet.png` files are **64×112 px**, commonly arranged as 16 px cells; many `Faceset.png` files are **38×38 px**. These are common patterns, not a guarantee for every resource.
- Standard character folders commonly include separate `Idle`, `Walk`, `Attack`, `Jump`, `Dead`, `Item`, `Special1` and `Special2` sheets. Check each file dimension, frame count and frame order before defining Phaser animations.
- `Actor/Monster/*/SpriteSheet.png` examples are commonly 64×64 px with 38×38 px facesets. Animal and boss layouts vary considerably.
- Tileset image dimensions vary. Do not assume the tile size, margin, spacing, tile IDs or animation order from a filename alone. Check the actual image and its intended atlas/grid before importing.
- The archive has preview GIFs and aggregate sheets that help identify resources. Use the original individual PNG/WAV/OGG files for integration, not preview sheets.
- Keep original relative paths where possible and add imports through the project asset-preload conventions. Avoid renaming or flattening assets because similar filenames occur in different folders.

## Project constraints and integration recommendations

1. **Keep the ZIP as the untouched master copy.** Do not import the entire 2,234-file collection into the Vite bundle.
2. For each feature, select only the exact sprite/audio/UI files required and copy them into a clearly named project folder after review.
3. Never overwrite the current DSA Quest `Hunter`, `Elder`, tilesets, menu art or map assets just because a similarly named asset exists in this archive.
4. The approved 35×35 gameplay map, tile positions, collision, camera, world geometry and movement remain unchanged. New art can be used in UI overlays, NPC sprites at verified safe coordinates, and effects without changing map geometry.
5. The teammate-created manga illustrations are a separate art deliverable. Use this pack for the in-game pixel-art characters, objects, UI and effects; do not try to turn its tiny sprite sheets into the opening manga panels.
6. Before integrating any sprite, document its path, dimensions, frame size, frame order, intended role and whether it is a replacement or an additional asset.

## Licence / credits

The archive README identifies the authors as **Pixel-boy** and **AAA**, and states the pack is released under **CC0 1.0 Universal**. It says attribution is not required but appreciated, and links to the creator and pack pages. The included `LICENSE.txt` contains the CC0 text and its limitations/disclaimers. Preserve the README and LICENSE when storing or redistributing the original pack; for public project credits, a short acknowledgement is courteous. This inventory is based on the licence files supplied inside this archive, not an independent legal review.

## What this means for Phase 3

- **Now:** retain the pack as the reference library. Do not alter the map or bulk-copy files.
- **When the campaign foundation is stable:** choose the actual guardian sprites and relic icons, verify their animation sheets and interaction anchors, then integrate them one topic at a time.
- **When manga art arrives:** compare the hero and Elder designs in the manga with the actual game characters. Use the game sprites as character references, while keeping the manga illustrations as separate high-resolution cutscene images.

## Files created from this inspection

- `Ninja-Adventure-Asset-Pack-Inventory.md` – this human-readable inventory and reuse guide.
- `Ninja-Adventure-Asset-Pack-File-Index.csv` – full index of all 2,234 files with relative path, extension, byte size and image dimensions where readable.

**Repository status:** No changes were made to DSA Quest. The archive remains the original uploaded file.
