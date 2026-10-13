'use strict';
const fs = require('fs');
const L = fs.readFileSync('app/src/main/assets/games/knot-away/index.html', 'utf8').split(/\r?\n/);
const i = L.findIndex(l => /t\.className='tile'\+/.test(l || ''));
for (let k = i - 3; k < i + 9; k++) console.log(String(k + 1).padStart(5) + ' | ' + (L[k] || '').trim().slice(0, 112));