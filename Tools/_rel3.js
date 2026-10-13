'use strict';
const fs = require('fs');
const F = 'app/src/main/java/com/redundantstudios/arcade/ui/ModeActivity.kt';
const NL = fs.readFileSync(F, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const L = fs.readFileSync(F, 'utf8').split(NL);

/* Same expression-body trap as fitsPage: the old filterGames signature has no
   brace of its own, so the sweep stopped at the inner `}` of `games.filter { }`
   and left its header behind, producing two conflicting overloads. */
const ORPHAN = [
  '        /** Single source of truth for which games belong to a player count. */',
  '        fun filterGames(games: List<GameManifest>, playerCount: Int): List<GameManifest> =',
];
const at = L.findIndex((l, i) => L[i] === ORPHAN[0] && L[i + 1] === ORPHAN[1]);
if (at < 0) { console.log('MISS orphan filterGames header'); process.exit(1); }
L.splice(at, ORPHAN.length);
console.log('OK   orphaned filterGames header removed');

fs.writeFileSync(F, L.join(NL));
const out = fs.readFileSync(F, 'utf8');
console.log('\nverify:');
console.log('  one filterGames def :', (out.match(/fun filterGames\(/g) || []).length === 1);
console.log('  union filter        :', /fitsExactly\(it, playerCount\) \|\| fitsNearby\(it, playerCount\)/.test(out));
console.log('  fitsNearby defined  :', /fun fitsNearby\(/.test(out));
console.log('  fitsPage callers    :', (out.match(/fitsPage\(/g) || []).length);