'use strict';
const fs = require('fs');
const L = fs.readFileSync('app/src/main/assets/games/knot-away/index.html', 'utf8').split(/\r?\n/);
L.forEach((l, i) => { if (/hudLevel/.test(l || '')) console.log(String(i + 1).padStart(5) + ' | ' + (l || '').trim().slice(0, 104)); });
console.log('\n=== current tile innerHTML block ===');
const i = L.findIndex(l => /t\.className='tile'/.test(l || ''));
for (let k = i; k < i + 14; k++) console.log(String(k + 1).padStart(5) + ' | ' + (L[k] || '').trim().slice(0, 112));