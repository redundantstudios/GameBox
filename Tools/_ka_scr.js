'use strict';
const fs = require('fs');
const L = fs.readFileSync('app/src/main/assets/games/knot-away/index.html', 'utf8').split(/\r?\n/);
console.log('=== screens + show/hide ===');
L.forEach((l, i) => {
  if (/screen|showScreen|renderLevels\(\)/.test(l || '') && /levels|scr|show|hide/.test(l || ''))
    console.log(String(i + 1).padStart(5) + ' | ' + (l || '').trim().slice(0, 104));
});
console.log('\n=== levelsGrid / screen ids ===');
L.forEach((l, i) => { if (/id="levelsGrid"|id="scr|class="screen/.test(l || '')) console.log(String(i + 1).padStart(5) + ' | ' + (l || '').trim().slice(0, 104)); });
console.log('\n=== showScreen definition ===');
const i = L.findIndex(l => /function showScreen|function goto|function setScreen/.test(l || ''));
for (let k = i; k < i + 18 && k < L.length; k++) console.log(String(k + 1).padStart(5) + ' | ' + (L[k] || '').trim().slice(0, 104));