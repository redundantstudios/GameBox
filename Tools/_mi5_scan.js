'use strict';
const fs = require('fs');
const L = fs.readFileSync('app/src/main/assets/games/mimic/index.html', 'utf8').split(/\r?\n/);
const show = (re, n, label) => {
  console.log('=== ' + label + ' ===');
  let c = 0;
  L.forEach((l, i) => { if (re.test(l || '') && c++ < (n || 10)) console.log(String(i + 1).padStart(5) + ' | ' + (l || '').trim().slice(0, 108)); });
  console.log('');
};
console.log('=== lines 2380-2396 ===');
for (let k = 2379; k < 2396; k++) console.log(String(k + 1).padStart(5) + ' | ' + (L[k] || '').trim().slice(0, 110));
show(/SFX\.tap\(\)/, 20, 'SFX.tap sites');
show(/const SFX|SFX\s*=|function sfx|VOL|SND_VOL|MUS_VOL|vol\s*[:=]/i, 22, 'sound API + volumes');