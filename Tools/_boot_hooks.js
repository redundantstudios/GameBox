'use strict';
const fs = require('fs');
const path = require('path');

/* The shell polls window.__shellScreen to decide the banner and the back
   button. Each game has to SET it at boot, or neither ever appears. */
const JOBS = [
  ['knot-away', /showScreen\('home'\);\s*$/m, 'showScreen(home) at boot'],
  ['carroms', null, 'showHome() at boot'],
  ['truth-or-dare', null, 'title state at boot'],
];

for (const [id] of JOBS) {
  const f = path.join('app/src/main/assets/games', id, 'index.html');
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  console.log('===== ' + id + ' =====');
  // show the last few executable lines, which is where boot happens
  const tail = lines.slice(-60);
  tail.forEach((l, i) => {
    const t = (l || '').trim();
    if (!t) return;
    if (/showScreen\(|showHome\(|state\.phase\s*=|startGame\(|boot\(|init\(|requestAnimationFrame/.test(t)) {
      console.log(String(lines.length - 60 + i + 1).padStart(5) + ' | ' + t.slice(0, 92));
    }
  });
}