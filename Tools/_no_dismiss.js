'use strict';
const fs = require('fs');

/* The end sheet used to close on a backdrop tap, which let a player dismiss the
   result of a finished game by tapping outside it and stay on the board. The
   only ways out are now the sheet's own buttons, which is also what the ads
   hang off - a dismissed popup skipped them entirely. */
for (const g of ['chess', 'checkers']) {
  const f = `app/src/main/assets/games/${g}/index.html`;
  let s = fs.readFileSync(f, 'utf8');

  const oldLine = /  overSheet\.addEventListener\("click",function\(e\)\{ if\(e\.target===overSheet\) closeModal\(\); \}\);\n/;
  const newBlock =
    '  /* No backdrop tap-to-close on the end sheet. Dismissing it left the player\n' +
    '     sitting on a finished board, and it skipped the sheet\'s own buttons -\n' +
    '     which is where the ads are raised from. REMATCH or MAIN MENU, or nothing. */\n' +
    '  overSheet.addEventListener("click",function(e){ e.stopPropagation(); });\n';

  if (oldLine.test(s)) {
    s = s.replace(oldLine, newBlock);
    fs.writeFileSync(f, s);
  }

  const v = fs.readFileSync(f, 'utf8');
  console.log(g.padEnd(9),
    'backdrop close removed:', !/if\(e\.target===overSheet\) closeModal\(\)/.test(v),
    '| guarded:', /overSheet\.addEventListener\("click",function\(e\)\{ e\.stopPropagation\(\); \}\);/.test(v),
    '| other sheets untouched:',
      /if\(e\.target===pauseSheet\) closeModal\(\)/.test(v));
}