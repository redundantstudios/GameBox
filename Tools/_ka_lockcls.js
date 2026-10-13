'use strict';
const fs = require('fs');
const path = require('path');
const F = path.join('app', 'src', 'main', 'assets', 'games', 'knot-away', 'index.html');
const NL = fs.readFileSync(F, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const L = fs.readFileSync(F, 'utf8').split(NL);

const i = L.findIndex(l => /t\.className='tile'\+/.test(l || ''));
if (i < 0) { console.log('MISS className'); process.exit(1); }
console.log('was: ' + L[i].trim().slice(0, 120));

/* "locked" was gated on `unlocked&&!tmp`, i.e. it was applied to levels that
   WERE open and withheld from the ones that were shut - exactly backwards. A
   running renderLevels() proved it: the first level came out
   "tile locked current". */
L.splice(i, 1,
  "    /* 'locked' is for the shut levels, not the open ones. This was inverted and",
  '       made level 1 render dimmed with lock styling from the first launch. */',
  "    t.className='tile'+(!unlocked&&!tmp?' locked':'')+((unlocked&&!rec&&!tmp)?' current':'')+(adOK?' ad-open':'')+(tmp?' ad-temp':'');");

fs.writeFileSync(F, L.join(NL));
console.log('now: ' + L[i + 2].trim().slice(0, 120));