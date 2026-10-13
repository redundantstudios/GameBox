'use strict';
const fs = require('fs');
const f = 'PROGRESS.md';
let s = fs.readFileSync(f, 'utf8');

if (/Connect Four — director pass/.test(s)) { console.log('already recorded'); process.exit(0); }

const ENTRY = [
  '## Connect Four — director pass: 6 issues — 2026-10-12',
  '### 1. Landing stutter (the biggest one)',
  '- **`navigator.vibrate()` fired on every bounce**, not once per drop. A single marble bounced up to four',
  '  times, so a landing did up to five IPC calls into the system vibrator service — at exactly the moment',
  '  the marble settled and the eye is on it. Now one buzz, on the first contact above a power threshold.',
  '- **Every bounce fired a full particle burst.** `impact()` ran the same spark + wood-dust + ring set on',
  '  each of the 4–5 impacts, so one drop sprayed five bursts and jolted the whole board five times.',
  '  Later bounces now scale to ~1/3, and the wood dust and shockwave ring are first-contact only.',
  '- Bounce count 4 → 3.',
  '### 4. Start-up animation',
  '- **`resize()` always ran `buildIntroBG()`, which ends in `toDataURL()` on a full-screen canvas.**',
  '  `closeIntro()` calls `resize()` 50ms after hiding the start page — so every time a match began, the',
  '  app was **PNG-encoding a 1080x2400 canvas**, hundreds of milliseconds of jank right as the board',
  '  appears. Now: skipped entirely while the start page is hidden, cached by size, and encoded as JPEG.',
  '### 3. Start back button',
  '- The shell injects a plain white circle sized for a generic light game. On this dark walnut board it',
  '  read as a sticker, and it exited silently while everything else made a sound. Repainted in the game\'s',
  '  own `.barbtn` wood gradient with the cream chevron and the `:active` press, and it now plays `SFX.tap()`.',
  '  It WRAPS the shell handler rather than replacing it, so it still exits.',
  '### 2 / 7. Home button and returning to the start page',
  '- `#btnHome` now requests an interstitial and returns to the start page once the ad closes.',
  '### 5. Win order',
  '- The ad was *wrapping the call that shows the plaque*: ad → wait 1050ms → panel. Reversed — the win',
  '  panel shows first, then the interstitial is requested the instant after. Same for a drawn game.',
  '### 6. Drop sound',
  '- `launch()` was a single narrow noise sweep, 1.5kHz up to 4.2kHz at vol .10 — thin and hissy, more like',
  '  static than a marble leaving your finger. Replaced with a quieter low-mid sweep plus a short body tone.',
  '- The 6.8kHz highpass tick over the landing clink was the harshest part; narrowed to 5.2kHz and pulled back.',
  '### Latent crash found and fixed while verifying',
  '- `resize()` returns early (retrying in 60ms) when the script runs before the WebView has laid out, so',
  '  for the first frames BOTH board sprites are null. An earlier fix guarded only `tableSprite`;',
  '  `boardSprite` was still passed straight to `drawImage`, which threw `TypeError: The provided value is',
  '  not of type (...)` on every frame until the retry landed. `loop()` now skips drawing until both exist.',
  '  (And `buildTable()` was sizing its sprite with a bare `vw*dpr` while `buildBoard()` clamped with',
  '  `Math.max(2,…)` — same root cause, one frame earlier.)',
  '- **Lesson: when patching a file by split/replace, verify the replacement line count.** A `splice(i, 3, …)`',
  '  intended to replace 5 lines ate `g.save()` and `const ie=S.introT;`, producing 1082',
  '  `ReferenceError: ie is not defined` per run. Recovery was to regenerate from source and reapply the',
  '  whole patch chain rather than hand-repair. A repair script also joined lines with the BOOLEAN `CRLF`',
  '  instead of the string `\'\\r\\n\'`, and `Array.join` coerced it into the literal text `true` between',
  '  every pair of lines — worth never repeating.',
  '',
  '',
].join('\n');

s = s.replace('## Connect Four — LOCKED, first integration pass — 2026-10-12\n',
  '## Connect Four — director pass: 6 issues — 2026-10-12\n' + ENTRY +
  '## Connect Four — LOCKED, first integration pass — 2026-10-12\n');

fs.writeFileSync(f, s);
console.log('OK   PROGRESS.md updated');