'use strict';
const fs = require('fs');
const s = fs.readFileSync('app/src/main/assets/games/carroms/index.html', 'utf8').split(/\r?\n/);
s.forEach((l, i) => { if (/adcfYes|adcfNo/.test(l || '')) console.log(String(i + 1).padStart(5) + ' | ' + l.trim().slice(0, 100)); });
console.log('--- stray block ---');
const j = s.findIndex(l => /adcfYes'\)\.addEventListener/.test(l || ''));
if (j >= 0) for (let k = j - 3; k < j + 10; k++) console.log(String(k + 1).padStart(5) + ' |' + JSON.stringify(s[k]));