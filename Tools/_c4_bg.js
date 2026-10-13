'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join('app', 'src', 'main', 'assets', 'games', 'connect-four', 'index.html');
let s = fs.readFileSync(FILE, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
let lines = s.split(NL);

/* ---- restore the dropped buildIntroBG() call ----
   The pass-2 resize patch replaced the single line
     buildTable();buildBoard();buildIntroBG();
   with the geometry guard plus `buildTable();buildBoard();` - silently dropping
   the third call, so the start page fell back to the flat #a57743 CSS colour
   with no plank, no grain, no screws and no frame. */
{
  const i = lines.findIndex(l => l.trim() === 'buildTable();buildBoard();');
  if (i < 0) { console.log('MISS buildTable line'); process.exit(1); }
  lines.splice(i, 1, '  buildTable();buildBoard();buildIntroBG();');
  console.log('OK   buildIntroBG() call restored in resize()');
}

/* ---- drop sound, a little quieter again ---- */
{
  const i = lines.findIndex(l => l.includes('noise({fc:820,fe:2100,dur:.06,vol:.05'));
  if (i < 0) { console.log('MISS launch noise'); process.exit(1); }
  lines[i] = "      noise({fc:760,fe:1900,dur:.055,vol:.032,q:.7,pan:p,rev:.1});";
  const j = lines.findIndex(l => l.includes('tone({f:240,f2:150,dur:.055,vol:.045'));
  if (j < 0) { console.log('MISS launch tone'); process.exit(1); }
  lines[j] = "      tone({f:210,f2:135,dur:.05,vol:.028,type:'sine',pan:p});";
  console.log('OK   drop sound softened a further step');
}

fs.writeFileSync(FILE, lines.join(NL));

const out = fs.readFileSync(FILE, 'utf8');
console.log('  verify buildIntroBG in resize:',
  /buildTable\(\);buildBoard\(\);buildIntroBG\(\);/.test(out));
console.log('  verify quieter launch:',
  /fc:760,fe:1900,dur:\.055,vol:\.032/.test(out) && /f:210,f2:135,dur:\.05,vol:\.028/.test(out));