'use strict';
const fs = require('fs');
const L = fs.readFileSync('app/src/main/assets/games/truth-or-dare/index.html', 'utf8').split(/\r?\n/);
console.log('=== header / topbar markup ===');
L.forEach((l, i) => {
  if (i > 330 && i < 560 && /icon-btn|btnBack|topbar|header|class="bar|nav|btnSet|btnHelp|btnInfo|<main|<section|id="screen|footer/i.test(l || ''))
    console.log(String(i + 1).padStart(5) + ' | ' + (l || '').trim().slice(0, 112));
});
console.log('\n=== icon-btn buttons in markup ===');
L.forEach((l, i) => { if (/class="icon-btn/.test(l || '')) console.log(String(i + 1).padStart(5) + ' | ' + (l || '').trim().slice(0, 112)); });
console.log('\n=== btnRedraw context ===');
const d = L.findIndex(l => /id="btnRedraw"/.test(l || ''));
for (let k = d - 12; k < d + 6; k++) console.log(String(k + 1).padStart(5) + ' | ' + (L[k] || '').trim().slice(0, 112));