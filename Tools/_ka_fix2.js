'use strict';
const fs = require('fs');
const path = require('path');
const F = path.join('app', 'src', 'main', 'assets', 'games', 'knot-away', 'index.html');
const NL = fs.readFileSync(F, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(F, 'utf8').split(NL);

const i = lines.findIndex(l => /window\.__shellRewarded\('knotaway\.level_unlock'/.test(l || ''));
if (i < 0) { console.log('MISS call'); process.exit(1); }

/* The previous splice replaced 5 lines of a 6-line call, orphaning its "});". */
let k = i + 1;
while (k < lines.length && lines[k].trim() !== '});') k++;
if (lines[k + 1] !== undefined && lines[k + 1].trim() === '});') {
  lines.splice(k + 1, 1);
  console.log('OK   orphan "});" removed (was line ' + (k + 2) + ')');
} else {
  console.log('no orphan found after line ' + (k + 1));
}

fs.writeFileSync(F, lines.join(NL));
const L = fs.readFileSync(F, 'utf8').split(NL);
const j = L.findIndex(l => /window\.__shellRewarded\('knotaway/.test(l || ''));
console.log('\nresult:');
for (let n = j - 8; n < j + 6; n++) console.log(String(n + 1).padStart(5) + ' | ' + (L[n] || '').trim().slice(0, 104));