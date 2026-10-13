'use strict';
const fs = require('fs');
const path = require('path');
const F = path.join('app', 'src', 'main', 'assets', 'games', 'knot-away', 'index.html');
let s = fs.readFileSync(F, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
const lines = s.split(NL);

/* The kit is now a persistent balance, so the per-level SNAPSHOT is the bug: it
   was captured once when the level loaded and never moved, so a retry - and any
   path that reuses it - handed back the pre-use count. That is exactly the
   "I used one and it came back" report. The kit IS the allowance; read it
   straight from the save everywhere. */
{
  const i = lines.findIndex(l => l.indexOf('G.undoLeft=G.undoSnap;G.hintLeft=G.hintSnap;') >= 0);
  if (i < 0) { console.log('MISS snapshot line'); }
  else {
    lines.splice(i, 1,
      '  /* Straight from the save, NOT the snapshot. The snapshot was taken when the',
      '     level loaded and never updated, so a retry restored the count from before',
      '     the player had spent one - the kit appeared to reset. The kit is a',
      '     balance now, so every path reads the live value. */',
      '  kit();G.undoLeft=save.undo;G.hintLeft=save.hint;');
    console.log('OK   restart reads the live kit, not a stale snapshot');
  }
}

/* Drop the now-meaningless snapshot bookkeeping. */
{
  let n = 0;
  for (let k = 0; k < lines.length; k++) {
    if (/G\.undoSnap=G\.undoLeft;G\.hintSnap=G\.hintLeft;/.test(lines[k])) { lines.splice(k, 1); k--; n++; }
  }
  console.log('OK   removed ' + n + ' snapshot assignment(s)');
}

/* Belt and braces: flush the save whenever a run ends, so a shell exit can never
   lose a spend. */
{
  const i = lines.findIndex(l => l.indexOf("on('#btnHomeC'") >= 0);
  if (i >= 0) {
    lines.splice(i, 0, "try{ persist(); }catch(e){}   /* flush a spent hint/undo before leaving */");
    console.log('OK   flush save on leaving the game');
  }
}

fs.writeFileSync(F, lines.join(NL));
const out = fs.readFileSync(F, 'utf8');
console.log('  no snapshot reads :', !/G\.undoSnap;G\.hintLeft=G\.hintSnap/.test(out));
console.log('  live kit on restart:', /kit\(\);G\.undoLeft=save\.undo;G\.hintLeft=save\.hint;/.test(out));
console.log('  snapshot captured :', /undoSnap/.test(out));