'use strict';
const fs = require('fs');
const path = require('path');
const F = path.join('app', 'src', 'main', 'assets', 'games', 'mimic', 'index.html');
let lines = fs.readFileSync(F, 'utf8').split(/\r?\n/);
lines.forEach((l, i) => {
  if (/fillText\(p\.name/.test(l || '')) console.log(String(i + 1).padStart(5) + ' |' + JSON.stringify(l));
});
console.log('--- title best card block ---');
const j = lines.findIndex(l => l.indexOf('const bs=bests[diffKey].s||0;') >= 0);
for (let k = j; k < j + 28; k++) console.log(String(k + 1).padStart(5) + ' | ' + (lines[k] || '').trim().slice(0, 100));