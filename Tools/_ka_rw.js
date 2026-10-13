'use strict';
const fs = require('fs');
const ka = fs.readFileSync('app/src/main/assets/games/knot-away/index.html', 'utf8').split(/\r?\n/);
console.log('=== knot-away: all rewarded() calls ===');
ka.forEach((l, i) => { if (/\brewarded\(/.test(l || '')) console.log(String(i + 1).padStart(5) + ' | ' + (l || '').trim().slice(0, 112)); });
console.log('\n=== knot-away: rewarded definition + B ===');
ka.forEach((l, i) => { if (/function rewarded\(|var B=|B\s*=\s*window\.NativeBridge|var seq=/.test(l || '')) console.log(String(i + 1).padStart(5) + ' | ' + (l || '').trim().slice(0, 112)); });
console.log('\n=== knot-away: is rewarded inside an IIFE? (walk back for wrapper) ===');
{
  const i = ka.findIndex(l => /function rewarded\(/.test(l || ''));
  for (let k = i; k >= 0 && k > i - 60; k--) {
    const t = (ka[k] || '').trim();
    if (/^(function|\(function|window\.|var )/.test(t) && k < i) { console.log('  ctx@' + (k + 1) + ': ' + t.slice(0, 100)); break; }
  }
}
console.log('\n=== knot-away: openAdConfirm ===');
{
  const i = ka.findIndex(l => /function openAdConfirm/.test(l || ''));
  for (let k = i; k < i + 20; k++) console.log(String(k + 1).padStart(5) + ' | ' + (ka[k] || '').trim().slice(0, 112));
}