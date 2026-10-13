'use strict';
const fs = require('fs');
const s = fs.readFileSync('app/src/main/assets/games/carroms/index.html', 'utf8').split(/\r?\n/);
const i = s.findIndex(l => l.indexOf('id="p-adconfirm"') >= 0);
console.log('p-adconfirm at line ' + (i + 1));
for (let k = i - 8; k < i + 14; k++) console.log(String(k + 1).padStart(5) + ' | ' + (s[k] || '').trim().slice(0, 92));
console.log('--- overlay close-on-outside handlers ---');
s.forEach((l, j) => {
  if (/overlay\.addEventListener|overlay\.onclick/.test(l || '')) console.log(String(j + 1).padStart(5) + ' | ' + l.trim().slice(0, 92));
});
console.log('--- tcell onclick (theme cell) ---');
const t = s.findIndex(l => /c\.onclick=\(\)=>\{/.test(l || ''));
for (let k = t; k < t + 12; k++) console.log(String(k + 1).padStart(5) + ' | ' + (s[k] || '').trim().slice(0, 92));