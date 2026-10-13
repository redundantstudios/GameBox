'use strict';
const fs = require('fs');
const L = fs.readFileSync('app/src/main/assets/games/knot-away/index.html', 'utf8').split(/\r?\n/);
console.log('=== tile / panel / btn CSS ===');
L.forEach((l, i) => {
  const t = (l || '').trim();
  if (/^\.tile|^\.panel|^\.btn|^\.lock/.test(t)) console.log(String(i + 1).padStart(5) + ' | ' + t.slice(0, 104));
});
console.log('\n=== panels markup ===');
const i = L.findIndex(l => /id="panelComplete"/.test(l || ''));
for (let k = Math.max(0, i - 3); k < i + 10 && k < L.length; k++) console.log(String(k + 1).padStart(5) + ' | ' + (L[k] || '').trim().slice(0, 104));
console.log('\n=== openPanel / closePanel ===');
L.forEach((l, j) => { if (/function openPanel/.test(l || '')) console.log(String(j + 1).padStart(5) + ' | ' + l.trim().slice(0, 104)); });