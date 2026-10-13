'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join('app', 'src', 'main', 'assets', 'games', 'carroms', 'index.html');
let s = fs.readFileSync(FILE, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
const lines = s.split(NL);

const start = lines.findIndex(l => l.indexOf('/* After a successful unlock the sheet closes') >= 0);
if (start < 0) { console.log('MISS stray comment'); process.exit(1); }
let end = start;
while (end < lines.length && lines[end].trim() !== '});') end++;
if (end >= lines.length) { console.log('MISS stray end'); process.exit(1); }
console.log('removing lines ' + (start + 1) + '-' + (end + 1));
lines.splice(start, end - start + 1);
fs.writeFileSync(FILE, lines.join(NL));

const out = fs.readFileSync(FILE, 'utf8');
console.log('OK   stale listener removed');
console.log('  adcfYes bindings:', (out.match(/adcfYes'\)\.(onclick|addEventListener)/g) || []).length);