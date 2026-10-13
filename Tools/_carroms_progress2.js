'use strict';
const fs = require('fs');
const f = 'PROGRESS.md';
let s = fs.readFileSync(f, 'utf8');
if (/Carroms — director pass 2/.test(s)) { console.log('already recorded'); process.exit(0); }

const ENTRY = [
  '## Carroms — director pass 2: 5 issues, LOCKED — 2026-10-12',
  '- **LOCKED.** Treat `app/src/main/assets/games/carroms/index.html` as frozen: no drive-by edits. Any new',
  '  request becomes a numbered pass on top, recorded here.',
  '- **Back button disappeared from the start page — my own regression.** The previous pass gated it on',
  "   `__shellScreen==='home' && !Panels.isOpen()`, but the home page is ITSELF a panel (`.panel.home` shown",
  '  inside the overlay), so `Panels.isOpen()` is true there as well and the button was hidden everywhere.',
  '  The correct test is whether the panel on screen is `p-home`.',
  "- **The double tap sound was the back button itself.** It is a `<button>`, so the global pointerdown handler",
  "  played the click for it — and its own onclick played it again. Removed the second one; the global covers",
  '  it. (A `_clickClaimed` guard with a `setTimeout(...,0)` release could not have caught this: `click`',
  '  fires after `pointerup`, a separate task, so the flag had already cleared.)',
  '- **Panel transitions: the director wanted SMOOTHER and LONGER, which is the opposite of the last pass.**',
  '  `pop` is now .44s on a soft `cubic-bezier(.22,.75,.28,1)` with a three-keyframe fade-in, and the backdrop',
  '  eases in over .34s so the sheet is never sliding over a snapping backdrop.',
  '- **Seat 1 is always HUMAN.** Every seat offered a BOT/HUMAN toggle, so P1 could be a bot too — which is',
  '  how a bot-only game was reachable. P1 now renders a fixed, non-clickable HUMAN chip and the click handler',
  '  refuses to set index 0 to bot. Subtitle reworded from "PICK BOT OR HUMAN" to "PICK WHO PLAYS".',
  '- **How to Play had no way out.** The card steps (welcome, congratulations) offered only a forward button.',
  '  Added a quiet CANCEL under CONTINUE on the welcome card (clears tutorial state and returns to the start',
  '  page) and BACK on the congratulations card (returns to the aiming lesson).',
  '',
  '',
].join('\n');

s = s.replace('## Carroms — director pass: 6 issues — 2026-10-12\n',
  ENTRY + '## Carroms — director pass: 6 issues — 2026-10-12\n');
fs.writeFileSync(f, s);
console.log('OK   PROGRESS.md — Carroms locked');