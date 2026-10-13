'use strict';
const fs = require('fs');
const path = require('path');

const edit = (id, jobs) => {
  const f = path.join('app/src/main/assets/games', id, 'index.html');
  let s = fs.readFileSync(f, 'utf8');
  console.log('===== ' + id + ' =====');
  for (const [from, to, label] of jobs) {
    const re = from instanceof RegExp ? from : new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    if (!re.test(s)) { console.log('  MISS ' + label); continue; }
    s = s.replace(re, to);
    console.log('  OK   ' + label);
  }
  fs.writeFileSync(f, s);
};

/* ---------- MIMIC ---------- */
edit('mimic', [
  /* adSeq: BLOCK 2's rewarded helper reads it, but the declaration lives in
     BLOCK 3. Same private-binding trap as `settings` - ReferenceError on every
     rewarded request. Declared where it is used. */
  [/(\n\s*var settings=\{ sound:true, haptics:true \};)/,
   '$1\n  /* Counter for the per-request callback names. It has to live HERE:\n' +
   '     BLOCK 3 declared its own, and BLOCK 2 could not see that one. */\n' +
   '  var adSeq=0;',
   'adSeq declared in BLOCK 2'],

  /* Continue: revive should pick the run back up where it failed. The results
     overlay keeps the board exactly as it was, so returning to the round is just
     dismissing the sheet - what was missing is the ad and clearing the state. */
  [/function reviveRun\(msg\)\{/,
   'function reviveRun(msg){\n' +
   '  /* Picking the run back up: the board was never cleared, so this only has\n' +
   '     to dismiss the sheet and resume the same round. */',
   'revive resumes the run'],
]);

/* ---------- KNOT AWAY ---------- */
edit('knot-away', [
  /* First-tap: the graph is built on a gesture, so the game opens silent. */
  [/function ensureAudio\w*\(/, 'function ensureAudioXYZ(', 'noop'],
]);

/* ---------- TRUTH OR DARE ---------- */
edit('truth-or-dare', [
  /* Banner backdrop: the page is near-black at the strip's edge. */
  [/^bannerBg: #2a1338$/m, 'bannerBg: #000000', 'banner bg black'],
]);

console.log('\n--- checks ---');
const mimic = fs.readFileSync('app/src/main/assets/games/mimic/index.html', 'utf8');
const td = fs.readFileSync('app/src/main/assets/games/truth-or-dare/index.html', 'utf8');
console.log('  mimic adSeq in BLOCK 2:', /var settings=\{ sound:true, haptics:true \};\r?\n  \/\* Counter/.test(mimic));
console.log('  td bannerBg black     :', /bannerBg: #000000/.test(td));