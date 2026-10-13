'use strict';
const fs = require('fs');
const path = require('path');
const F = path.join('app', 'src', 'main', 'assets', 'games', 'knot-away', 'index.html');
const NL = fs.readFileSync(F, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(F, 'utf8').split(NL);

/* Anchor on the last line of the replacement call itself, then drop the "});"
   that the old invocation left immediately after it. */
const i = lines.findIndex(l => /^\s*\}, function\(\)\{ kaToast\('AD NOT AVAILABLE'\); \}\);/.test(l || ''));
if (i < 0) { console.log('MISS anchor'); process.exit(1); }
console.log('call ends at line ' + (i + 1));

if (lines[i + 1] !== undefined && lines[i + 1].trim() === '});') {
  lines.splice(i + 1, 1);
  console.log('OK   orphan "});" removed');
} else {
  console.log('MISS orphan - next line is: ' + (lines[i + 1] || '').trim().slice(0, 80));
}

fs.writeFileSync(F, lines.join(NL));
const L = fs.readFileSync(F, 'utf8').split(NL);
const j = L.findIndex(l => /window\.__shellRewarded\('knotaway/.test(l || ''));
console.log('\nresult:');
for (let n = j - 2; n < j + 8; n++) console.log(String(n + 1).padStart(5) + ' | ' + (L[n] || '').trim().slice(0, 100));