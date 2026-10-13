'use strict';
const fs = require('fs');
const s = fs.readFileSync('app/src/main/assets/games/carroms/index.html', 'utf8').split(/\r?\n/);
const i = s.findIndex(l => l.indexOf("$('#profRow').innerHTML=") >= 0);
console.log('--- renderProfiles ---');
for (let k = i; k < i + 22; k++) console.log(String(k + 1).padStart(5) + ' | ' + (s[k] || '').trim().slice(0, 104));
console.log('--- .ptb.locked style present? ---');
s.forEach((l, n) => { if (/ptb\.locked/.test(l || '')) console.log('  ' + String(n + 1).padStart(5) + ' | ' + l.trim().slice(0, 90)); });