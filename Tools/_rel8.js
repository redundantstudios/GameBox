'use strict';
const fs = require('fs');
const F = 'app/src/main/assets/games/chess/index.html';
let L = fs.readFileSync(F, 'utf8').split(/\r?\n/);
let removed = 0;

// 1. The listener on the removed panel. testAdEl is null now, so this threw
//    at boot and would have taken the whole game down.
{
  const i = L.findIndex(l => /testAdEl\.addEventListener/.test(l || ''));
  if (i >= 0) { L.splice(i, 1); removed++; console.log('OK    removed testAdEl.addEventListener (would have thrown at boot)'); }
  else console.log('SKIP  listener already gone');
}

// 2. the $() lookups for the removed panel
{
  const i = L.findIndex(l => /testAdEl=\$\("testAd"\)/.test(l || ''));
  if (i >= 0) {
    L.splice(i, 2,
      '  /* the simulated test-ad panel was removed; these are gone with it */');
    removed++;
    console.log('OK    removed testAdEl/taKind/taBody/taUnit/taNote/taCount/taClose lookups');
  } else console.log('SKIP  lookups already gone');
}

// 3. the dead CSS
{
  const keep = [];
  for (const l of L) {
    if (/^\s*#(taKind|taBody|taNote|taUnit|taCount|taClose)\b/.test(l || '')) { removed++; continue; }
    keep.push(l);
  }
  if (keep.length !== L.length) console.log('OK    removed dead panel CSS (' + (L.length - keep.length) + ' rules)');
  L = keep;
}

fs.writeFileSync(F, L.join('\n'));

const s = fs.readFileSync(F, 'utf8');
console.log('\nverify:');
console.log('  no testAdEl   :', !/testAdEl/.test(s));
console.log('  no taKind     :', !/taKind/.test(s));
console.log('  no showTestAd :', !/showTestAd/.test(s));
console.log('  no SIMULATED  :', !/SIMULATED/.test(s));
console.log('  real ads kept :', /Studio\.ads\.interstitial/.test(s) && /Studio\.ads\.rewarded/.test(s));
console.log('  removals      :', removed);