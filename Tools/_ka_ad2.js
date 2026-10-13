'use strict';
const fs = require('fs');
const path = require('path');
const F = path.join('app', 'src', 'main', 'assets', 'games', 'knot-away', 'index.html');
const NL = fs.readFileSync(F, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(F, 'utf8').split(NL);

const i = lines.findIndex(l => /^\.tile\.ad-open\{/.test(l || ''));
if (i < 0) { console.log('MISS .tile.ad-open'); process.exit(1); }
if (!/position:\s*relative/.test(lines[i])) {
  lines[i] = lines[i].replace('.tile.ad-open{', '.tile.ad-open{position:relative;');
  console.log('OK   .tile.ad-open is a positioning context for its pulse ring');
} else console.log('SKIP already relative');

fs.writeFileSync(F, lines.join(NL));
console.log(lines[i]);