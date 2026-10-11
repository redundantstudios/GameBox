'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/ember/index.html';
let s = fs.readFileSync(f, 'utf8');

s = s.replace(/bannerBg: #\w+/, 'bannerBg: #05070c');

/* Show the game-over ad again on the next run, exactly as orrery does. */
const reset = s.indexOf('function resetRun');
if (reset >= 0 && !/resetRun[\s\S]{0,900}deathAdShown=false/.test(s)) {
  const lineEnd = s.indexOf('\n', reset);
  s = s.slice(0, lineEnd + 1) + '  deathAdShown=false;\n' + s.slice(lineEnd + 1);
  console.log('reset inserted after resetRun');
} else {
  console.log('reset: ' + (reset >= 0 ? 'resetRun not found' : 'already present'));
}

fs.writeFileSync(f, s);
console.log('bannerBg:', s.match(/bannerBg: #\w+/)[0]);
console.log('hook   :', /if\(!deathAdShown\)/.test(s) ? 'present' : 'MISSING');