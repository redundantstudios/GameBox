'use strict';
const fs = require('fs');
const path = require('path');
const F = path.join('app', 'src', 'main', 'assets', 'games', 'mimic', 'index.html');
const before = fs.readFileSync(F, 'utf8');
const NL = before.includes('\r\n') ? '\r\n' : '\n';
const lines = before.split(NL);

/* The earlier run put the constant inside the CFG object literal (it matched
   "audio:{" as the anchor), which is not valid. Lift the comment + const out
   and place it immediately after "const CFG={" so it is a real statement. */

const first = lines.findIndex(l => /^\/\* Overall loudness for the three tone helpers/.test(l || ''));
const last = lines.findIndex(l => /const SND_BOOST=1\.45;/.test(l || ''));
if (first < 0 || last < 0) { console.log('MISS block', first, last); process.exit(1); }

const block = lines.splice(first, last - first + 1);
console.log('lifted ' + block.length + ' lines out of the CFG object');

const cfg = lines.findIndex(l => /^const CFG\s*=\s*\{/.test(l || ''));
if (cfg < 0) { console.log('MISS CFG'); process.exit(1); }
// BEFORE the declaration: "const CFG={" opens an object literal, so anything
// placed after that line is still inside it and will not parse.
lines.splice(cfg, 0, ...block);
console.log('OK   SND_BOOST now a top-level statement before const CFG={');

fs.writeFileSync(F, lines.join(NL));
const out = fs.readFileSync(F, 'utf8');
const i = out.indexOf('const CFG={');
console.log('\ncontext:');
console.log(out.slice(i - 60, i + 420));