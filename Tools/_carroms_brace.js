'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join('app', 'src', 'main', 'assets', 'games', 'carroms', 'index.html');
let s = fs.readFileSync(FILE, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
const lines = s.split(NL);

const i = lines.findIndex(l => l.trim() === "S('open')");
if (i < 0) { console.log('MISS S(open)'); process.exit(1); }
lines[i] = "    S('open')" + NL + '  },';
fs.writeFileSync(FILE, lines.join(NL));
console.log('OK   restored show() closing brace');