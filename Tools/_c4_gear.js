'use strict';
const fs = require('fs');
const path = require('path');
const f = path.join('app/src/main/assets/games', 'connect-four', 'index.html');
let s = fs.readFileSync(f, 'utf8');

const eol = s.includes('\r\n') ? '\r\n' : '\n';
const lines = s.split(/\r?\n/);

// Line-anchored: find the gear handler and insert the sync before its close.
let i = lines.findIndex(l => l.indexOf("$('#gear')") >= 0);
if (i < 0) { console.log('MISS gear handler'); process.exit(1); }

// Walk to the closing "});" of this handler.
let j = i + 1;
while (j < lines.length && lines[j].trim() !== '});') j++;
if (j >= lines.length) { console.log('MISS close'); process.exit(1); }

if (lines.slice(i, j + 1).some(l => l.indexOf('syncShellOverlay') >= 0)) {
  console.log('already applied');
} else {
  lines.splice(j, 0, '  syncShellOverlay();');
  s = lines.join(eol);
  fs.writeFileSync(f, s);
  console.log('OK   settings block banner (inserted before line ' + (j + 1) + ')');
}
console.log('verified:', /setEl\.classList\.add\('on'\);\}\r?\n {2}syncShellOverlay\(\);/.test(s));