'use strict';
const fs = require('fs');
const path = require('path');
const F = path.join('app', 'src', 'main', 'assets', 'games', 'knot-away', 'index.html');
const NL = fs.readFileSync(F, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(F, 'utf8').split(NL);

/* The replacement text already completes the call, so the very next "});" is the
   leftover closer from the old invocation. Drop exactly that one. */
const i = lines.findIndex(l => /window\.__shellRewarded\('knotaway\.level_unlock'/.test(l || ''));
if (i < 0) { console.log('MISS call'); process.exit(1); }
let k = i;
while (k < lines.length && !/;\s*$/.test(lines[k].trim())) k++;   // end of my call
console.log('call ends at line ' + (k + 1) + ': ' + lines[k].trim().slice(0, 80));
if (lines[k + 1] !== undefined && lines[k + 1].trim() === '});') {
  lines.splice(k + 1, 1);
  console.log('OK   orphan "});" removed');
} else {
  console.log('MISS orphan - next line is: ' + (lines[k + 1] || '').trim().slice(0, 80));
}

fs.writeFileSync(F, lines.join(NL));
const L = fs.readFileSync(F, 'utf8').split(NL);
const j = L.findIndex(l => /window\.__shellRewarded\('knotaway/.test(l || ''));
console.log('\nresult:');
for (let n = j - 2; n < j + 8; n++) console.log(String(n + 1).padStart(5) + ' | ' + (L[n] || '').trim().slice(0, 100));