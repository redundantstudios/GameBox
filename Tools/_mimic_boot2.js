'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/mimic/index.html';
const raw = fs.readFileSync(f, 'utf8');
const EOL = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r?\n/);

/* The leftover copy sitting AFTER `settings:settings,` - i.e. inside the object
   literal, where a bare IIFE is not a legal property. Remove from its comment
   down to the closing `})();` that follows it. */
const anchor = lines.findIndex(l => /^\s*settings:settings,\s*$/.test(l));
if (anchor < 0) { console.log('MISS anchor'); process.exit(1); }

let start = -1;
for (let i = anchor + 1; i < lines.length; i++) {
  if (/The shell owns sound\/haptics and is the source of truth/.test(lines[i])) { start = i; break; }
}
if (start < 0) { console.log('no leftover IIFE - already clean'); process.exit(0); }

let end = -1;
for (let i = start; i < lines.length; i++) {
  if (/^\s*\}\)\(\);\s*$/.test(lines[i])) { end = i; break; }
}
if (end < 0) { console.log('MISS closing'); process.exit(1); }

console.log('removing lines ' + (start + 1) + '..' + (end + 1));
lines.splice(start, end - start + 1);
fs.writeFileSync(f, lines.join(EOL));
console.log('done');