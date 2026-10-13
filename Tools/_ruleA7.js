'use strict';
const fs = require('fs');
const F = 'app/src/main/java/com/redundantstudios/arcade/ui/ModeActivity.kt';
const NL = fs.readFileSync(F, 'utf8').includes('\r\n') ? '\r\n' : '\n';
let L = fs.readFileSync(F, 'utf8').split(NL);

/* The old filterGames doc's "/**" opener survived and my one-line replacement
   landed INSIDE it, so that opener never closed and everything after it was
   swallowed as comment text. Drop the orphan opener, the two orphaned body
   lines and the duplicate closer. */
const at = L.findIndex((l, k) =>
  l.trim() === '/**' &&
  L[k + 1] && /Games an N PLAYER page lists\./.test(L[k + 1]) &&
  L[k + 2] && L[k + 2].trim() === '*');
if (at < 0) { console.log('MISS orphaned filterGames doc'); process.exit(1); }
console.log('found orphaned doc at line ' + (at + 1));
L.splice(at, 3, '        /** Games an N PLAYER page lists: see [fitsOnPage] for the rule. */');

fs.writeFileSync(F, L.join(NL));
const s = fs.readFileSync(F, 'utf8');
const o = (s.match(/\/\*\*/g) || []).length, c = (s.match(/\*\//g) || []).length;
console.log('\nverify:');
console.log('  comment pairs   : ' + o + ' / ' + c);
console.log('  filterGames ok  :', /fun filterGames\(/.test(s));
console.log('  single rule     :', /games\.filter \{ fitsOnPage\(it, playerCount\) \}/.test(s));
console.log('  no fitsExactly  :', !/fitsExactly/.test(s));
console.log('  no fitsNearby   :', !/fitsNearby/.test(s));
console.log('  NEW on top      :', /if \(it\.id in NEW_GAME_IDS\) 0 else 1/.test(s));