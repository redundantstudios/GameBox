'use strict';
const fs = require('fs');
const f = 'PROGRESS.md';
let s = fs.readFileSync(f, 'utf8');
if (/Carroms — director pass/.test(s)) { console.log('already recorded'); process.exit(0); }

const ENTRY = [
  '## Carroms — director pass: 6 issues — 2026-10-12',
  '- **Glitchy panel transitions.** `Panels.show()` toggled `showing` on every panel in one pass, so the',
  '  outgoing and incoming panels animated simultaneously while the backdrop was still fading. Now the',
  '  outgoing panel is unmounted first and the incoming one is mounted on the next frame, so the `pop`',
  '  keyframes cannot overlap the backdrop. The keyframe itself was also softened from `scale(.9)` + 16px',
  '  of travel to `scale(.965)` + 8px.',
  '- **One tap, two click sounds.** A global `pointerdown` listener played the click for any button, AND',
  '  several button handlers played it again themselves — so those buttons fired it twice. The global is',
  '  now the single owner and claims the sound once per press; the two handlers that duplicated it (theme',
  '  grid cell, profile cards) no longer call it.',
  '- **Theme unlock confirmation.** Tapping a locked theme went straight into the ad. There is now a',
  '  confirmation sheet: title, "Watch an ad to unlock <name> for 2 hours?", a swatch of the theme, a note',
  '  about it working offline, and WATCH AD & UNLOCK / NOT NOW. The ad only runs on an explicit YES.',
  '  NOTE: the panel had to be positioned with `position:fixed; inset:0; margin:auto` — as an overlay flex',
  '  item it rendered low in the sheet with its second button off the bottom while every other panel',
  '  centred fine, and `align-self`/`margin:auto 0` did not correct it. Fixed positioning also keeps the',
  '  shared `pop` keyframes from overriding its transform and making it jump on open.',
  '- **Game-over ad: it already had one** (`carroms.gameover`), but it fired BEFORE the panel was mounted.',
  '  Reordered to panel-first, ad immediately after, matching the Connect Four ordering.',
  '- **Back button.** Repainted in the game palette (cream/gold, Baloo 2, `:active` press) and driven by the',
  "   game's own poll with `!important` rules so the shell's inline display loses either way. It now shows",
  '   on the start page ONLY — a settings or theme sheet is an overlay on the start page rather than its own',
  "   screen, so `__shellScreen` stays 'home' while one is open and the button has to hide for those too.",
  '- **First tap / BGM.** `audioEnsure()` was only called from a `pointerdown` listener, so the graph was',
  '  built on the first touch: the game opened silent and that tap did nothing but arm audio. The shell',
  '  lifts the autoplay gate, so the graph and the BGM are built at load.',
  '',
  '',
].join('\n');

s = s.replace('## Connect Four — director pass 4: the lag, at any cost — 2026-10-12\n',
  ENTRY + '## Connect Four — director pass 4: the lag, at any cost — 2026-10-12\n');
fs.writeFileSync(f, s);
console.log('OK   PROGRESS.md updated');