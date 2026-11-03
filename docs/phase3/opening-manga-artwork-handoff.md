# Opening Story Artwork Handoff

The story manifest defines the title, ordered pages, and ordered panels within
each page. The current five-page, two-panels-per-page layout is draft structure
only; the final story may use a different number of pages and any number of
panels on each page. The narration and dialogue in the current manifest are
explicitly pending approval, not final story copy.

## Image files

Use one PNG per panel. The current draft uses
`opening-panel-01.png` through `opening-panel-10.png`; those names do not limit
the final panel count. Extend the zero-padded numeric sequence as needed
(`opening-panel-11.png`, `opening-panel-12.png`, and so on), and update each
panel's `filename` and `src` in `src/game/story/openingMangaManifest.ts`.

The array order in the story manifest is authoritative: pages are read in
`pages` order, and panels within each page are read in that page's `panels`
order. A page may contain a different number of panels from any other page.
Changing the story order means changing the manifest order, not encoding text
or sequence into the image.

Recommended image dimensions are 1200 × 800 pixels per panel (3:2 landscape);
dimensions may vary where the final art needs a different composition. Use PNG
format. Do not include dialogue, speaker names, narration, captions, or other
text in the illustration. Those remain separate manifest fields and are
rendered by the viewer as UI overlays.

Place approved finished files in `public/assets/opening-manga/`, preserving the
filenames referenced by the manifest. The viewer's image paths can be changed
in that same central configuration if the final naming convention differs.
Do not enable `VITE_OPENING_MANGA_READY=true` in production until all referenced
art and separately approved story text are ready.
