'use strict';
const fs = require('fs');
const L = fs.readFileSync('app/src/main/assets/games/truth-or-dare/index.html', 'utf8').split(/\r?\n/);
L.forEach((l, i) => { if (/plansBtn|MONETIZATION/.test(l || '')) console.log(String(i + 1).padStart(5) + ' | ' + (l || '').trim().slice(0, 116)); });
const i = L.findIndex(l => /plansBtn/.test(l || '') && /\.onclick|addEventListener/.test(l || ''));
if (i >= 0) { console.log('\n--- handler ---'); for (let k = i - 2; k < i + 14; k++) console.log(String(k + 1).padStart(5) + ' | ' + (L[k] || '').trim().slice(0, 116)); }
console.log('\n=== start-wrap markup ===');
const j = L.findIndex(l => /class="start-wrap"/.test(l || ''));
for (let k = j; k < j + 5; k++) console.log(String(k + 1).padStart(5) + ' | ' + (L[k] || '').trim().slice(0, 116));