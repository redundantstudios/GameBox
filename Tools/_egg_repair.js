'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/egg-rush/index.html';
let s = fs.readFileSync(f, 'utf8');

/* The earlier edit left a mangled comment (the replacement dropped its own
   text) above the reset. Rebuild that block cleanly. The reset itself landed in
   the right place - immediately before state='COUNTDOWN', which every round
   goes through. */
const broken = s.match(/\n[ \t]*\/\* New round:[\s\S]*?overAdDone=false;\n/);
if (broken) {
  s = s.replace(broken[0],
    '\n /* New round: allow one game-over interstitial again. Without this the flag\n' +
    '    stayed set after the first round and every later finish asked for none. */\n' +
    ' overAdDone=false;\n');
  fs.writeFileSync(f, s);
}

const v = fs.readFileSync(f, 'utf8');
const ok = /New round: allow one game-over interstitial again\.\s*\n\s*\*?\s*stayed set after the first round/.test(v);
console.log('comment repaired :', ok);
console.log('reset present    :', /overAdDone=false;\s*\n\s*state='COUNTDOWN'/.test(v));
console.log('game over hook   :', /overAdDone=true; withAd\('gameover'/.test(v));