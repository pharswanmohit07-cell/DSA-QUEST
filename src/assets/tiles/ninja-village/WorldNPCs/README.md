# World NPC assets — provenance

The PNG files under each character folder are copied unmodified from the
**Ninja Adventure Asset Pack**:

- Authors: **Pixel-boy** and **AAA**
- Licence: **CC0 1.0 Universal** (attribution not required, but credited here)
- Source: <https://pixel-boy.itch.io/ninja-adventure-asset-pack>

Each folder `<Name>/` maps 1:1 to the archive path
`Actor/Character/<Name>/`:

- `Idle.png` ← `Actor/Character/<Name>/SeparateAnim/Idle.png` (64×16,
  four 16×16 direction frames in down/up/left/right order)
- `Walk.png` ← `Actor/Character/<Name>/SeparateAnim/Walk.png` (64×64,
  four directions × four 16×16 frames, row-major, same direction order)
- `Faceset.png` ← `Actor/Character/<Name>/Faceset.png` (38×38)

Copied character folders: Boy, Eskimo, Inspector, Knight, KnightGold, Master,
Monk2, NinjaBlue, NinjaGreen, NinjaRed, Noble, OldMan2, OldMan3, Princess,
SamuraiBlue, Sultan, Villager2, Villager4, Villager5, Villager6, Woman.

Files are byte-for-byte copies — no recoloring, resizing, redrawing, or
recompression. All were visually verified to use the standard 16×16 humanoid
layout shared with the Elder and Training NPC sheets already in the game.

Characters verified to NOT have a complete idle+walk+faceset set and therefore
excluded: `OldWoman` (faceset only), `Child` (faceset only), `ManGreen`
(no faceset), `NinjaLeaf`/`NinjaThunder`/`NinjaWater` (no idle sheets).
See `docs/asset-library/ninja-adventure/Ninja-Adventure-Asset-Pack-Inventory.md`
for the full pack inventory and licence summary.
