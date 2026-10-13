'use strict';
const fs = require('fs');
const L = fs.readFileSync('app/src/main/assets/games/mimic/index.html', 'utf8').split(/\r?\n/);
const g = { tapN: [], clayTone: [], toneAt: [] };
L.forEach((l) => {
  for (const fn of ['tapN', 'clayTone', 'toneAt']) {
    const m = (l || '').match(new RegExp(fn + '\\(([0-9.]+)'));
    if (m) g[fn].push(Number(m[1]));
  }
});
for (const k in g) {
  const v = g[k].sort((a, b) => a - b);
  if (!v.length) { console.log(k.padEnd(10) + ' none'); continue; }
  console.log(k.padEnd(10) + ' n=' + v.length + ' min=' + v[0] + ' med=' + v[Math.floor(v.length / 2)] + ' max=' + v[v.length - 1]);
}
console.log('--- tapN body ---');
for (let k = 303; k < 316; k++) console.log(String(k + 1).padStart(5) + ' | ' + (L[k] || '').trim().slice(0, 104));
console.log('--- master / final gain ---');
for (let k = 266; k < 276; k++) console.log(String(k + 1).padStart(5) + ' | ' + (L[k] || '').trim().slice(0, 104));