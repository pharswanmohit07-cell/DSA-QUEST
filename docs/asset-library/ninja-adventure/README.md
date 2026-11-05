# Ninja Adventure Asset Reference Library

This directory is the searchable reference index for the Ninja Adventure Asset
Pack. It documents the pack without copying its 2,234 assets into the game or
production bundle. The original ZIP and extracted pack remain outside this Git
repository.

## Reference files

- [Ninja-Adventure-Asset-Pack-Inventory.md](./Ninja-Adventure-Asset-Pack-Inventory.md)
  summarizes the categories, candidate resources, technical cautions, and
  documented licence information.
- [Ninja-Adventure-Asset-Pack-File-Index.csv](./Ninja-Adventure-Asset-Pack-File-Index.csv)
  indexes all 2,234 files. Its columns are `relative_path`, `extension`,
  `file_size_bytes`, `width_px`, and `height_px`.

The archive is organized around `Actor`, `Backgrounds`, `Items`, `FX`, `Ui`,
and `Audio`, alongside previews, palette/reference images, and the original
README and licence. The inventory records 1,366 Actor files, 361 UI files,
188 audio files, 142 item files, 105 effects, and 61 background files. The
index also records the individual archive entries; use it for exact filenames
and dimensions rather than assuming a category summary covers every path.

## Finding an asset

Search the CSV's `relative_path` column by filename, character, action, or
folder. For example, search for `OldMan`, `Faceset`, `SpriteSheet`,
`GemGreen`, `Magic/Circle`, `Ui/Dialog`, or `Audio/Musics`. With PowerShell:

```powershell
$index = Import-Csv .\docs\asset-library\ninja-adventure\Ninja-Adventure-Asset-Pack-File-Index.csv
$index | Where-Object { $_.relative_path -like '*OldMan*' }
$index | Where-Object { $_.relative_path -like 'FX/Magic/Circle/*' }
```

The `relative_path` value is the asset's original path relative to the root of
the asset-pack archive. Preserve its spelling, capitalization, spaces, and
directory structure when locating the original file in the external extracted
pack. Do not treat a CSV path as an existing path inside this repository.

The index is useful for filtering candidate files and inspecting recorded image
dimensions; the inventory provides category context and selected examples.
Preview images and GIFs can help identify artwork, but use the original
individual resource for any approved integration.

## Inspection before integration

Never infer animation layout from a filename or from another sprite in the
same pack. Before using a resource in Phaser, inspect that exact image and
confirm its pixel dimensions, frame dimensions, frame count, row/column
arrangement, action, direction order, and any transparent padding or offsets.
Check the intended tile size, grid, margins, spacing, and animation layout for
each tileset or effect sheet as well. The inventory's common sizes are examples,
not guarantees: the indexed resources have varying dimensions and layouts.

Keep original asset filenames and directory structure. Do not rename or flatten
files; similar names can occur in different directories. Preserve the external
ZIP as the untouched source copy. If a feature is approved for implementation,
select and review only the specific files it needs, then use the project's
appropriate asset-loading conventions. Do not bulk-copy or import this library
into the game or production bundle.

## Future DSA Quest asset-integration rules

1. Search this library before creating or sourcing replacement pixel art.
2. Reuse existing characters, NPCs, portraits, and animations where
   appropriate, while keeping existing DSA Quest character choices intact
   unless a change is separately approved.
3. Investigate item sprites as references for the seven ancient relics.
4. Investigate visual effects for shrine activation and relic restoration.
5. Audition suitable music and sound effects for story scenes and quests before
   choosing them.
6. Check the available UI resources before proposing new interfaces; this does
   not authorize changing existing DSA Quest UI.
7. Preserve original asset files, filenames, capitalization, and directory
   structure.
8. Verify each sprite's frame dimensions and directional layout before using
   it in Phaser.
9. Do not import assets into the game until the relevant feature is approved.

Candidate paths in the inventory are research leads, not approved selections.
For example, it identifies `Actor/Character/OldMan/` as a possible mentor
reference; `Items/Resource/` and `Items/Treasure/` for item research;
`FX/Magic/` for effect research; `Ui/Dialog/` and `Ui/Theme/` for UI research;
and `Audio/Musics/` and `Audio/Sounds/` for audio audition. Review each
individual file before deciding whether it fits a feature.

## Licence and attribution

The original archive README names **Pixel-boy** and **AAA** as the asset
creators and says the pack is released under the **Creative Commons Zero (CC0)
licence**. It states that attribution is not required but is appreciated, and
that the assets may be used in games, including commercial games. The README
provides these creator and pack links:

- Pixel-boy: <https://pixel-boy.itch.io/>
- AAA: <https://www.instagram.com/challenger.aaa/?hl=fr>
- Patreon: <https://www.patreon.com/pixelarchipel>
- Itch.io: <https://pixel-boy.itch.io/>
- Ninja Adventure Asset Pack: <https://pixel-boy.itch.io/ninja-adventure-asset-pack>

The included `LICENSE.txt` is titled **CC0 1.0 Universal**. It describes a
waiver of copyright and related rights to the extent permitted by law, with a
public-license fallback if a waiver is ineffective. Its limitations state that
trademark and patent rights are not affected; the work is offered as-is without
warranties; the affirmer disclaims responsibility for clearing rights or
obtaining permissions that may apply to other people; and Creative Commons is
not a party to the document. The licence points to
<http://creativecommons.org/publicdomain/zero/1.0/>.

This summary reflects the supplied archive README and `LICENSE.txt`; consult
those original files for their complete terms and wording. The inventory notes
that attribution is not required but a short public acknowledgement is
courteous. This reference is not an independent legal review.