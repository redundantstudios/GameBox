'use strict';
const fs = require('fs');
const lines = fs.readFileSync('app/src/main/assets/games/mimic/index.html', 'utf8').split(/\r?\n/);
lines.forEach((l, i) => {
  if (/shellBackBtn|__shellBackWood|back button, start screen/.test(l || ''))
    console.log(String(i + 1).padStart(5) + ' | ' + (l || '').trim().slice(0, 100));
});
console.log('--- surrounding ---');
const i = lines.findIndex(l => /__shellBackBtn/.test(l || ''));
for (let k = Math.max(0, i - 20); k < Math.min(lines.length, i + 4); k++)
  console.log(String(k + 1).padStart(5) + ' | ' + (lines[k] || '').trim().slice(0, 100));