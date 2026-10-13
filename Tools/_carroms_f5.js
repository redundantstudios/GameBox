'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join('app', 'src', 'main', 'assets', 'games', 'carroms', 'index.html');
let s = fs.readFileSync(FILE, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
let lines = s.split(NL);

const i = lines.findIndex(l => l.trim() === 'else{give();}');
if (i < 0) { console.log('MISS orphan else'); process.exit(1); }
lines.splice(i, 1);
fs.writeFileSync(FILE, lines.join(NL));
console.log('OK   removed orphaned else (left over from the removed __shellRewarded branch)');