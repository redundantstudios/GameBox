'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join('app', 'src', 'main', 'assets', 'games', 'knot-away', 'index.html');
let s = fs.readFileSync(FILE, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
const lines = s.split(NL);

/* The original block's tail was left behind after my replacement: a second
   var attach / appendChild / __shellBackBtn / }catch(e){} run. */
const dup = lines.findIndex(l =>
  l.indexOf('  var attach=function(){ if(!btn.parentNode)document.body.appendChild(btn); };') >= 0);
if (dup < 0) { console.log('MISS duplicate tail'); process.exit(1); }
console.log('duplicate tail at line ' + (dup + 1));
let j = dup;
while (j < lines.length && lines[j].trim() !== '}catch(e){}') j++;
if (j >= lines.length) { console.log('MISS tail end'); process.exit(1); }
lines.splice(dup, j - dup + 1);
fs.writeFileSync(FILE, lines.join(NL));
console.log('OK   removed ' + (j - dup + 1) + ' duplicated line(s)');