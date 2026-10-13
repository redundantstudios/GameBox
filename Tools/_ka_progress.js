'use strict';
const fs = require('fs');
const f = 'PROGRESS.md';
let s = fs.readFileSync(f, 'utf8');
if (/Knot Away — director pass/.test(s)) { console.log('already recorded'); process.exit(0); }

const ENTRY = [
  '## Knot Away — director pass: 6 issues — 2026-10-12',
  '- **BGM silent until something was tapped.** The earlier "arm the audio at boot" call had been written',
  '  *inside the pause -> home ad callback*, so it only ever ran after leaving a game that way; the graph was',
  '  still built from a `pointerdown` listener. It is now built and the music started at boot. Verified:',
  '  `AudioTrack: installed` at launch, before any touch.',
  '- **Back button.** Repainted in the game\'s own palette (parchment `#FFF6E2` -> walnut) with a centred',
  '  chevron, an `:active` press and the game tap sound, while still wrapping the shell exit handler.',
  '  Visibility is class-driven and keyed on the start page only, and written only on change — the shell was',
  '  assigning `style.display` every 400ms unconditionally, which both fought the centring and forced a',
  '  style invalidation in the WebView forever.',
  '- **Levels / progress persistence: already fine.** `save.levels[i] = {stars, moves, time}` was already in',
  '  `knotaway_v1` and restored on the level select.',
  '- **Hints and undos were NOT persistent.** They lived on the per-run `G` object, so they were rebuilt from',
  '  scratch every session and never saved. Now stored in the save file as `save.undo` / `save.hint`:',
  '  seeded to **2 each** on first ever launch, re-seeded into `G` on every level start, decremented (and',
  '  persisted) only by an actual use, and topped up by a rewarded ad. They never reset because a game was',
  '  started — starting a run no longer touches them at all.',
  '- **Pause sheet survived going home.** `showScreen()` is the single funnel out of a game and never closed',
  '  the overlay, so a sheet could outlive the game and sit on the start page. It now calls `closePanels()`',
  '  whenever leaving the `game` screen, which covers every route including the ad callbacks that run later.',
  '- **Lesson (again): verify replacement line counts.** A `splice(i, 3, …)` meant to replace 4 lines left a',
  '  stray `}` and broke the surrounding `try`. Caught by parsing each block after every patch.',
  '',
  '',
].join('\n');

s = s.replace('## Carroms — director pass 3: 2 issues, re-locked — 2026-10-12\n',
  ENTRY + '## Carroms — director pass 3: 2 issues, re-locked — 2026-10-12\n');
fs.writeFileSync(f, s);
console.log('OK   PROGRESS.md updated');