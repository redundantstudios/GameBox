'use strict';
const fs = require('fs');
const F = 'app/src/main/java/com/redundantstudios/arcade/SettingsActivity.kt';
const NL = fs.readFileSync(F, 'utf8').includes('\r\n') ? '\r\n' : '\n';
let L = fs.readFileSync(F, 'utf8').split(NL);

/* Removing only the first line of a multi-line binding left the body and its
   closing brace behind, producing a stray "}" that closed the class early. */
let i = L.findIndex(l => /ArcadeNotifier\.postDevTest/.test(l || ''));
if (i < 0) { console.log('SKIP  no orphaned postDevTest body'); }
else {
  console.log('found orphan at line ' + (i + 1) + ': ' + L[i].trim());
  // the orphan is the body line plus the now-dangling closing brace
  const end = L.slice(i).findIndex((l, k) => k > 0 && l.trim() === '}');
  L.splice(i, (end > 0 ? end : 0) + 1);
  console.log('OK    orphaned postDevTest binding removed');
}

fs.writeFileSync(F, L.join(NL));
console.log('\nverify:');
console.log('  postDevTest gone :', !/postDevTest/.test(fs.readFileSync(F, 'utf8')));
console.log('  btnTestNotif gone:', !/btnTestNotif/.test(fs.readFileSync(F, 'utf8')));