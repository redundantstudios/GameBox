'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join('app', 'src', 'main', 'assets', 'games', 'knot-away', 'index.html');
let s = fs.readFileSync(FILE, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
let lines = s.split(NL);

/* 1. kit() was called at module-eval time, before `const KIT_START` below it -
      a temporal dead zone error. It does not need to run there: the first
      startLevel() calls kit(), which is after initialisation. */
{
  const i = lines.findIndex(l => l.indexOf("kit();   /* seeds undo/hint to 2 on a fresh save */") >= 0);
  if (i < 0) console.log('MISS early kit call');
  else { lines.splice(i, 1); console.log('OK   removed the early kit() call (TDZ error)'); }
}

/* 2. the orphaned audio comment left behind inside the pause-home handler */
{
  const i = lines.findIndex(l => l.indexOf('* can actually make sound - leaving it to unlock() meant the game opened') >= 0);
  if (i < 0) console.log('MISS orphan comment');
  else {
    let s2 = i;
    while (s2 < lines.length && lines[s2].indexOf('setTimeout(function(){ try{ unlock(); }catch(e){} },0);') < 0) s2++;
    if (s2 >= lines.length) console.log('MISS orphan end');
    else { lines.splice(i - 1, s2 - i + 2); console.log('OK   removed the orphaned audio block'); }
  }
}

fs.writeFileSync(FILE, lines.join(NL));
console.log('  residual unlock-in-callback:', /showScreen\('home'\);\s*\r?\n\s*setTimeout\(function\(\)\{ try\{ unlock\(\)/.test(fs.readFileSync(FILE, 'utf8')));