'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/mimic/index.html';
let s = fs.readFileSync(f, 'utf8');

const swap = (from, to, label) => {
  const re = from instanceof RegExp ? from : new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  if (!re.test(s)) { console.log('MISS ' + label); return; }
  s = s.replace(re, to);
  console.log('OK   ' + label);
};

/* The mix was authored against a 1.0 bus; at 0.5 the peaks landed near 0.1 and
   the whole game was a whisper. The shell's volume still trims from there. */
swap(/audio:\{master:0\.5,/, 'audio:{master:0.95,', 'master level raised');

/* Drop the per-call logging - applyMaster runs often enough to be noise now
   that the fault is found. Keep the one that reports how the graph came up. */
swap(
  /  try\{ console\.log\('\[mimic\] master='[^\n]*\n[^\n]*\n?[^\n]*\}catch\(e\)\{\}/,
  '',
  'per-call log removed');

fs.writeFileSync(f, s);
console.log('\nchecks:');
console.log('  master 0.95 :', /master:0\.95/.test(s));
console.log('  no spam log :', (s.match(/\[mimic\] master=/g) || []).length === 0);
console.log('  ctx log kept:', /\[mimic\] ctx=/.test(s));