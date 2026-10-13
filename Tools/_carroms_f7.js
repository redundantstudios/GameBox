'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join('app', 'src', 'main', 'assets', 'games', 'carroms', 'index.html');
let s = fs.readFileSync(FILE, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
let lines = s.split(NL);

/* Pull the misplaced block back out. */
const start = lines.findIndex(l => l.indexOf('<!-- theme unlock confirmation -->') >= 0);
if (start < 0) { console.log('MISS block start'); process.exit(1); }
let end = start;
while (end < lines.length && lines[end].indexOf('</section>') < 0) end++;
const block = lines.slice(start, end + 1);
lines.splice(start, end - start + 1);

/* Put it INSIDE #overlay, next to the other panels. `#toast` lives in the overlay
   but before its close, so anchoring immediately before it is safe. */
let anchor = -1;
for (let k = 0; k < lines.length; k++) if (lines[k].indexOf('<div id="toast"></div>') >= 0) { anchor = k; break; }
if (anchor < 0) { console.log('MISS #toast anchor'); process.exit(1); }

lines.splice(anchor, 0, ...block, '');
fs.writeFileSync(FILE, lines.join(NL));

const out = fs.readFileSync(FILE, 'utf8');
const ovOpen = out.indexOf('id="overlay"');
const ovClose = out.indexOf('</div>', out.indexOf('id="canvas"'));
const pos = out.indexOf('id="p-adconfirm"');
console.log('OK   p-adconfirm moved inside #overlay');
console.log('  before overlay close:', pos > ovOpen && pos < out.indexOf('id="toast"') + 40);