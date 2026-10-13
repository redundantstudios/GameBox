'use strict';
const fs = require('fs');
const f = 'PROGRESS.md';
let s = fs.readFileSync(f, 'utf8');
if (/Connect Four — director pass 3/.test(s)) { console.log('already recorded'); process.exit(0); }

const ENTRY = [
  '## Connect Four — director pass 3: performance, and LOCKED — 2026-10-12',
  '- **Locked.** Treat `app/src/main/assets/games/connect-four/index.html` as frozen: no drive-by edits.',
  '  Any new request becomes a numbered pass on top, recorded here.',
  '### Performance — measured, not guessed',
  '- `adb shell dumpsys gfxinfo com.redundantstudios.arcade` BEFORE:',
  '  `Total frames 643 / Janky 458 (71%)`, `50th 14ms 90th 20ms 95th 22ms 99th 25ms`,',
  '  `Slow issue draw commands: 458`, `GPU 50th 2ms / 99th 4ms`.',
  '  The janky count matching "slow draw commands" exactly, with GPU time at 2-4ms, is the tell: the cost',
  '  is **CPU-side draw-command recording**, not the GPU. (Lesson: profile before optimising - two earlier',
  '  passes on this were aimed at the wrong layer.)',
  '- Cause: per frame the old code stroked two arcs for every filled cell and filled an ellipse for every',
  '  settled marble - ~250 path operations at a full board, redrawn 60x a second from data that never',
  '  changes. The arcs sit at fixed hole positions and the contact shadow is a soft blob, so both are now',
  '  baked into one overlay canvas (`buildOverlay()`) rebuilt only when the grid changes, and blitted.',
  '- `drawMarble()` also blitted three images per marble (shadow, body, gloss) - 126 on a full board -',
  '  when body and gloss never move relative to each other. They are pre-composed into `MSPR[p].full`,',
  '  so a marble is now 2 blits.',
  '- AFTER: `Total frames 2826 / Janky 66 (2.3%)`, `50th 10ms 90th 13ms 95th 18ms 99th 21ms`,',
  '  `Slow issue draw commands: 64`. Jank 71% -> 2.3%; p90 back inside the 16.7ms budget.',
  '### Regression I caused, and fixed',
  '- **The wooden start page went flat.** The pass-2 `resize()` guard replaced the single line',
  '  `buildTable();buildBoard();buildIntroBG();` with the guard plus `buildTable();buildBoard();` -',
  '  silently dropping the `buildIntroBG()` call, so the plank never painted and the start page fell back',
  '  to the flat CSS `#a57743`. **When replacing a line, verify the replacement covers every call on it.**',
  '### Drop sound',
  '- Softened one more step: sweep `1.5k->4.2k @ .10` (hissy) -> `820->2100 @ .05` -> `760->1900 @ .032`,',
  '  body tone `240->150 @ .045` -> `210->135 @ .028`.',
  '',
  '',
].join('\n');

s = s.replace('## Connect Four — director pass 2: 5 issues — 2026-10-12\n',
  ENTRY + '## Connect Four — director pass 2: 5 issues — 2026-10-12\n');
fs.writeFileSync(f, s);
console.log('OK   PROGRESS.md — Connect Four locked');