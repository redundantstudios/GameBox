'use strict';
const fs = require('fs');
const s = fs.readFileSync('app/src/main/assets/games/colour-rush/index.html', 'utf8').split(/\r?\n/);
const re = /res-|pause|over|endGame|gameOver|TIME UP|bindTap/;
s.forEach((l, i) => {
  const t = (l || '').trim();
  if (re.test(t) && /(id=|bindTap|function|classList|addEventListener)/.test(t)) {
    console.log(String(i + 1).padStart(5) + ' | ' + t.slice(0, 92));
  }
});