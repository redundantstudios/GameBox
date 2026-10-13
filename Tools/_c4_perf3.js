'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join('app', 'src', 'main', 'assets', 'games', 'connect-four', 'index.html');
let s = fs.readFileSync(FILE, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
let lines = s.split(NL);
const i = lines.findIndex(l => l.trim() === '},480);');
if (i < 0) { console.log('MISS 480'); process.exit(1); }
lines[i] = '          },240);';
fs.writeFileSync(FILE, lines.join(NL));
console.log('OK   bot aim-to-drop 480ms -> 240ms');