'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join('app', 'src', 'main', 'assets', 'games', 'knot-away', 'index.html');
let s = fs.readFileSync(FILE, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
const lines = s.split(NL);

/* The poll splice consumed 3 lines but the original if-block was 4, leaving a
   stray "}" and the orphaned "}" of the surrounding try. */
const i = lines.findIndex(l => l.indexOf("      window.__shellBackBtn.classList.toggle('on',onHome);") >= 0);
if (i < 0) { console.log('MISS poll tail'); process.exit(1); }
// expected: ... toggle, }, }  <- extra brace
console.log('context: ' + JSON.stringify(lines.slice(i + 1, i + 5)));
if (lines[i + 1].trim() === '}' && lines[i + 2].trim() === '}') {
  lines.splice(i + 2, 1);
  console.log('OK   removed the stray brace');
} else {
  console.log('unexpected shape - not patching');
  process.exit(1);
}
fs.writeFileSync(FILE, lines.join(NL));