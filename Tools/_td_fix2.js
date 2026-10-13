'use strict';
const fs = require('fs');
const path = require('path');
const F = path.join('app', 'src', 'main', 'assets', 'games', 'truth-or-dare', 'index.html');
const NL = fs.readFileSync(F, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(F, 'utf8').split(NL);

/* The footer was inserted before scrSetup's own </section> while also adding a
   closing tag, so the section ended twice and the footer landed outside it.
   Keep exactly one close, after the footer. */
{
  const foot = lines.findIndex(l => /foot-brand">REDUNDANT STUDIOS/.test(l || ''));
  if (foot < 0) { console.log('MISS footer'); process.exit(1); }
  // the stray close sits between the .start-wrap block and the footer
  let stray = -1;
  for (let k = foot - 1; k >= 0; k--) {
    if (lines[k].trim() === '</section>') { stray = k; break; }
    if (lines[k].trim() === '</div>') break;   // stop at the end of start-wrap
  }
  if (stray < 0) { console.log('MISS stray close'); process.exit(1); }
  lines.splice(stray, 1);
  console.log('OK   removed the duplicate </section> (was line ' + (stray + 1) + ')');
}

fs.writeFileSync(F, lines.join(NL));
const out = fs.readFileSync(F, 'utf8');
const o = (out.match(/<section/g) || []).length;
const c = (out.match(/<\/section>/g) || []).length;
console.log('sections: ' + o + ' open / ' + c + ' close');
console.log('\nresult:');
const L = out.split(/\r?\n/);
const i = L.findIndex(l => /foot-brand">REDUNDANT STUDIOS/.test(l));
for (let k = i - 4; k < i + 5; k++) console.log(String(k + 1).padStart(5) + ' | ' + (L[k] || '').trim().slice(0, 96));