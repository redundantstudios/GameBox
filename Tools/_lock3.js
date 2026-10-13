'use strict';
const fs = require('fs');
const f = 'PROGRESS.md';
let s = fs.readFileSync(f, 'utf8');
if (/Mimic .* LOCKED/.test(s)) { console.log('already recorded'); process.exit(0); }

const header = '# Project Progress\n\n';
if (s.slice(0, header.length) !== header) { console.log('unexpected header'); process.exit(1); }

const entry = [
  '## Mimic / Knot Away / Truth or Dare — final pass, all three LOCKED — 2026-10-13',
  '',
  'All three verified on device and frozen. Any further request becomes a numbered pass on top.',
  '',
  '### MIMIC — LOCKED',
  '- **The middle disc showed a player name instead of the stage.** In Last Standing and Own Pattern it',
  '  printed `p.name`, so it read `P5` while a pattern was showing, and `MIMI` when arriving straight',
  '  from MIMI mode (the name was left over from the previous mode). It now shows `WATCH` while the',
  '  pattern plays, and the player\'s own name during their turn. `WATCH` wears a fixed slate',
  '  (`#3F5570`) that is not in the player palette, so it can never be read as somebody\'s turn; the',
  '  name wears that player\'s colour. Solo is unchanged - it is your own marble, so it shows your name.',
  '- **ADD A TILE sat on top of the tiles, then on top of the bottom seat circle.** The seats are on a',
  '  ring of radius `R`, so the lowest is centred at `cy+R` and its edge reaches `cy+R+RP`; the pill was',
  '  placed at `cy+MR*2.35`, which lands inside that circle on a normal phone. It is now measured from the',
  '  real bottom of the board and clamped so a short screen cannot push it off the edge.',
  '- **The start-page back button was a filled triangle on a flat outlined circle** - and it was not even',
  '  `backBtn()`, which only serves the setup and how-to popups. `drawTitle()` drew its own. Both now use',
  '  the same `clayCircleBtn(CREAM, C_DARK)` as the settings gear and share one `drawBackArrow`.',
  '- **The arrow pointed right and sat off-centre.** First the apex was on the right; then the extents',
  '  ran `-0.8r` to `+1.5r`, leaving it visibly right of centre. Now symmetric at `-0.78r`..`+0.78r`.',
  '- **`SFX is not defined` on the mode-setup back button** — a previous pass added `SFX.tap()` to two',
  '  handlers, but MIMIC has no `SFX` object: its audio is `tapN()`/`clayTone()`/`toneAt()`. Both threw',
  '  mid-handler. Removed; `uiTick()` already plays the click.',
  '- **Volume.** Ticks were firing at 0.08–0.30 into a 0.95 master. One `SND_BOOST=1.45` on the peak gain',
  '  of each of the three tone helpers, clamped below 1 so layered voices cannot clip.',
  '- BEST SCORE moved from the top-right corner to centred under HOW TO PLAY, anchored to the title',
  '  geometry (`g.howY`/`g.btnH`) so it tracks the button at any screen size.',
  '',
  '### KNOT AWAY — LOCKED',
  '- **Hint/undo appeared to reset.** `restartLevel()` restored `G.undoSnap`/`G.hintSnap`, a snapshot taken',
  '  once when the level loaded and never updated, so a retry handed back the pre-use count. Both read live',
  '  from `save.undo`/`save.hint` now; snapshots deleted, and the save is flushed before leaving the game.',
  '- **The level-unlock ad never fired.** `rewarded()` is declared inside the shell integration IIFE, so it',
  '  is NOT global — calling it from the game block threw a `ReferenceError` and nothing happened on tap.',
  '  Now `window.__shellRewarded(\'knotaway.level_unlock\', ...)`, the same door the hint/undo refill uses,',
  '  with a guard that toasts `AD NOT AVAILABLE` if the bridge is missing.',
  '- **Rewarded ad to open the next level for 30 minutes.** The offer sits on the first locked level — the',
  '  one whose predecessor is open — never on any other. Gold chip + pulsing ring, tap opens a confirm',
  '  sheet, then a toast naming the level. Three stars promotes the level to a permanent unlock; otherwise',
  '  it lapses after 30 minutes and expired grants are pruned on load.',
  '- **Live countdown on the tile, above the level number.** Absolute expiry is kept on the element as',
  '  `data-until`, so a reload mid-countdown resumes the right number instead of restarting from 30:00.',
  '  Gold, turning red in the last minute. Ticks once a second, tied to `showScreen` so it only runs',
  '  while the level list is open. Also shown on the in-game HUD chip for that level.',
  '- **`locked` class was applied to OPEN levels** — the condition read `unlocked&&!tmp`. Caught by a',
  '  runtime test, not by the syntax or boot checks: level 1 rendered dimmed with lock styling from the',
  '  first launch. Now `!unlocked&&!tmp`.',
  '',
  '### TRUTH OR DARE — LOCKED',
  '- **The back button was a `position:fixed` white circle containing a single `‹` character, floating',
  '  over the `<h1>`** — hence the title overlap. It is now a real `.icon-btn` using the game\'s own',
  '  `#i-back` sprite (added), living in the top row: `space-between` puts it on the far left, square with',
  '  help and gear on the right. The visibility toggle uses `grid`, not `block`, so the icon-btn grid',
  '  centring survives.',
  '- Footer now reads **REDUNDANT STUDIOS** (the `ARCADE PARTY` wordmark left the top row to make room).',
  '- **GIVE ME ANOTHER removed** — button and handler. The handler had to go too: `$(\'#plansBtn\')',
  '  .onclick` would have dereferenced null and thrown, killing every binding below it in the block.',
  '  The plans overlay stays in the markup, unreachable.',
  '- How-to list renumbered after losing its redraw step.',
  '',
  '### Verification note',
  '- Parse + boot smoke is NOT sufficient here. It let through two real runtime bugs this session (an',
  '  inverted `locked` class, and a temporal dead zone that would have broken the level list entirely).',
  '  `Tools/_ka_runtime.js` / `_ka_runtime2.js` lift the real `renderLevels`/`lvlOpen`/`adEligible`/',
  '  `tempLevel`/`fmtRemain` out of the game IIFE and execute them against a stub DOM. Worth extending',
  '  to the other games before they ship.',
  '- Mid-session a regex in a patch script truncated `carroms/index.html` from 2669 lines to 1698. It was',
  '  recovered from the built APK and confirmed byte-identical by SHA-256 before the audio fix was',
  '  re-applied. Hash-check assets after any bulk text surgery.',
  '- Splices have repeatedly left orphan braces/`</section>`/`});` that parse cleanly only when they do',
  '  not. Several caught pre-build, but the pattern is worth eliminating.',
  '',
  '',
].join('\n');

s = header + entry + s.slice(header.length);
fs.writeFileSync(f, s);
console.log('OK   PROGRESS.md updated');
const out = fs.readFileSync(f, 'utf8');
console.log('  new section at line 3 :', /^## Mimic \/ Knot Away/.test(out.split(/\r?\n/)[2]));
console.log('  bytes 46636 ->', out.length);
console.log('  carroms entry intact :', /## Carroms . director pass 2/.test(out));