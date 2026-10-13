'use strict';
const fs = require('fs');
const f = 'PROGRESS.md';
let s = fs.readFileSync(f, 'utf8');
if (/Connect Four — director pass 2/.test(s)) { console.log('already recorded'); process.exit(0); }

const ENTRY = [
  '## Connect Four — director pass 2: 5 issues — 2026-10-12',
  '- **Intermittent lag: the bot search ran on the main thread.** Medium/hard negamax had a 220ms / 480ms',
  '  budget and executed synchronously, so *every bot turn* froze the whole game for up to nearly half a',
  '  second — exactly the reported "sometimes smooth, sometimes very laggy" (smooth while the marble moved,',
  '  hard-stuck on every bot move). `engine` was turned into a named `engineFactory` so its source can be',
  '  handed to a Web Worker (`const engine=(()=>{...})()` only kept `{choose}`, and `{}.toString()` is',
  '  `[object Object]`). The search now runs off-thread; `easyMove()` reads live state so it stays inline but',
  '  does no search. Falls back to the original synchronous path if the Worker cannot start.',
  '- **No input until the marble settles.** It used to allow a drop while one was still in the air and',
  '  queued the choice in `S.pending` to replay on landing. `canAct()` now also requires `!anyFalling()`,',
  '  which gates the aim drag, the drop and the keyboard together.',
  '- **Slow after an interstitial, two causes.** (a) A fullscreen ad stops rAF for its whole duration, so',
  '  on return the frame clock is stale, the particle backlog is old and the board textures are usually',
  '  gone from the GPU — `afterAd()` now resyncs all of it and is called on every ad return via `shellAd()`.',
  '  (b) Ad show/hide fires a burst of resize events and *each one* rebuilt a full-screen table canvas and',
  '  re-bored all 42 holes — `resize()` now early-returns when the geometry is unchanged.',
  '- **Back button glyph off-centre.** The shell poll writes `style.display` every 400ms, which discarded',
  '  the flex centring and pinned the chevron into the corner. The button is now styled with `!important`',
  '  rules in both directions and this game drives visibility with its own class poll.',
  '- **MENU on the win plaque now requests an interstitial.**',
  '- **Bonus fix found while testing MENU:** `showIntro()` never reset which pane was showing, so leaving',
  '  mid-game after PLAY returned you to the opponent/skill *setup*, not the start page. It now',
  '  `switchView(\'ipMain\')`.',
  '',
  '',
].join('\n');

s = s.replace('## Connect Four — director pass: 6 issues — 2026-10-12\n',
  '## Connect Four — director pass 2: 5 issues — 2026-10-12\n' + ENTRY +
  '## Connect Four — director pass: 6 issues — 2026-10-12\n');
fs.writeFileSync(f, s);
console.log('OK   PROGRESS.md updated');