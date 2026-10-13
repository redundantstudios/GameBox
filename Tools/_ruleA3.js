'use strict';
const fs = require('fs');
const F = 'app/src/main/java/com/redundantstudios/arcade/ui/ModeActivity.kt';
const NL = fs.readFileSync(F, 'utf8').includes('\r\n') ? '\r\n' : '\n';
let L = fs.readFileSync(F, 'utf8').split(NL);

/* ordering: drop the exact/near split key and its comment */
{
  const i = L.findIndex(l => /then exact fits, then the \+\/-1 ones/.test(l || ''));
  if (i < 0) { console.log('MISS order comment'); process.exit(1); }
  // the comment spans 3 lines ending just before the key line
  let s = i;
  while (s > 0 && !/compareBy\(/.test(L[s - 1])) s--;
  const k = L.findIndex((l, x) => x >= s && /fitsExactly\(it, playerCount\)/.test(l || ''));
  if (k < 0) { console.log('MISS order key'); process.exit(1); }
  L.splice(s, k - s + 1);
  console.log('OK   ordering key removed');
}

/* filterGames: single rule */
{
  const i = L.findIndex(l => /fitsExactly\(it, playerCount\) \|\| fitsNearby\(it, playerCount\)/.test(l || ''));
  if (i < 0) { console.log('MISS filterGames'); process.exit(1); }
  L[i] = '            games.filter { fitsOnPage(it, playerCount) }';
  console.log('OK   filterGames uses fitsOnPage');

  // fix the doc above it
  const d = L.findIndex((l, x) => x < i && /Established games appear only when/.test(l || ''));
  if (d >= 0) {
    let e = d;
    while (e < L.length && L[e].trim() !== '*/') e++;
    L.splice(d, e - d + 1, '        /** Games an N PLAYER page lists: see [fitsOnPage] for the rule. */');
    console.log('OK   filterGames doc');
  }
}

fs.writeFileSync(F, L.join(NL));
const s = fs.readFileSync(F, 'utf8');
console.log('\nverify:');
console.log('  no fitsExactly:', !/fitsExactly/.test(s));
console.log('  no fitsNearby :', !/fitsNearby/.test(s));
console.log('  single rule   :', /games\.filter \{ fitsOnPage\(it, playerCount\) \}/.test(s));
console.log('  NEW still top :', /if \(it\.id in NEW_GAME_IDS\) 0 else 1/.test(s));