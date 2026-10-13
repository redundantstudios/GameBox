'use strict';
const fs = require('fs');
const F = 'app/src/main/assets/games/chess/index.html';
const NL = fs.readFileSync(F, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const L = fs.readFileSync(F, 'utf8').split(NL);

/* The declaration that starts at `const app=$("app"), ...` is one long
   comma-separated chain terminated by a semicolon. Removing its last two lines
   took the semicolon with them, so the next `const` was read as a syntax
   error. Put the terminator on the final surviving entry. */
{
  const i = L.findIndex(l => /soonOk=\$\("soonOk"\),\s*$/.test(l || ''));
  if (i < 0) { console.log('MISS final chain entry'); process.exit(1); }
  L[i] = '  soonOk=$("soonOk");';
  console.log('OK   declaration terminated at soonOk');

  const j = L.findIndex(l => /simulated test-ad panel was removed/.test(l || ''));
  if (j >= 0) {
    L.splice(j, 1);
    // put the note above the declaration instead, where it cannot break it
    const k = L.findIndex(l => /^const \$=id=>/.test(l || ''));
    L.splice(k, 0,
      '/* The simulated TEST AD panel was development scaffolding and has been',
      '   removed; its element lookups went with it. */');
    console.log('OK   note moved above the declaration');
  }
}

fs.writeFileSync(F, L.join(NL));
const s = fs.readFileSync(F, 'utf8');
console.log('\nverify:');
console.log('  chain terminated :', /soonOk=\$\("soonOk"\);/.test(s));
console.log('  no testAdEl      :', !/testAdEl/.test(s));