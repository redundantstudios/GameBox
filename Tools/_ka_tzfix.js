'use strict';
const fs = require('fs');
const path = require('path');
const F = path.join('app', 'src', 'main', 'assets', 'games', 'knot-away', 'index.html');
const NL = fs.readFileSync(F, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const L = fs.readFileSync(F, 'utf8').split(NL);

/* const tmp was used on the className line but declared on the next one, which
   is a temporal dead zone ReferenceError - it would have thrown on every render
   of the level list. Move the declaration up with the other per-level values. */
const decl = L.findIndex(l => /^\s*const tmp=\(tempLevel\(\)/.test(l || ''));
if (decl < 0) { console.log('MISS decl'); process.exit(1); }
L.splice(decl, 1);
console.log('OK   removed the late declaration');

const anchor = L.findIndex(l => /const unlocked=lvlOpen\(i\),rec=save\.levels\[i\],adOK=adEligible\(i\);/.test(l || ''));
if (anchor < 0) { console.log('MISS anchor'); process.exit(1); }
L.splice(anchor + 1, 0,
  '    /* Is this the level the current ad grant opened? Needed before the',
  '       className line below, hence declared with the other per-level values. */',
  '    const tmp=(tempLevel()&&tempLevel().lvl===i)?tempLevel():null;');
console.log('OK   declared alongside the other per-level values');

fs.writeFileSync(F, L.join(NL));
const out = fs.readFileSync(F, 'utf8').split(NL);
const i = out.findIndex(l => /t\.className='tile'\+/.test(l || ''));
console.log('\nresult:');
for (let k = i - 4; k < i + 7; k++) console.log(String(k + 1).padStart(5) + ' | ' + (out[k] || '').trim().slice(0, 104));