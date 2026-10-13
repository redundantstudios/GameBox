'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/chinese-checkers/index.html';
let s = fs.readFileSync(f, 'utf8');
const before = s;

const swap = (from, to, label) => {
  if (!s.includes(from)) { console.log('MISS ' + label); return; }
  s = s.split(from).join(to);
  console.log('OK   ' + label);
};

/* The strip was re-evaluated on a tap and on two screen changes. Pausing,
   winning and opening the tutorial all left it exactly where it was - which is
   the "sometimes the banner is not working" report: on those screens it was
   meant to be gone and it stayed. Every one of those paths now updates it. */
swap("SFX.pause();show($('ovPause'))}",
     "SFX.pause();show($('ovPause'));try{syncBanner()}catch(e){}}",
     'pauseGame hides banner');

swap("G.paused=false;hide($('ovPause'));",
     "G.paused=false;hide($('ovPause'));try{syncBanner()}catch(e){}",
     'resumeGame restores banner');

swap('setTimeout(showWin,1500);',
     'setTimeout(showWin,1500);try{syncBanner()}catch(e){}',
     'finishGame hides banner');

swap("function showWin(){\r\n  if(!G||!G.winner)return;",
     "function showWin(){\r\n  if(!G||!G.winner)return;\r\n  try{syncBanner()}catch(e){}",
     'showWin hides banner');

swap('tut.from=from;tut.on=true;',
     'tut.from=from;tut.on=true;try{syncBanner()}catch(e){}',
     'tutorial open hides banner');

swap("tut.hl=[];hide($('ovTut'));",
     "tut.hl=[];hide($('ovTut'));try{syncBanner()}catch(e){}",
     'tutorial close restores banner');

fs.writeFileSync(f, s);

console.log('\nsyncBanner call sites:', (s.match(/syncBanner\(\)/g) || []).length);
['pauseGame', 'resumeGame', 'finishGame', 'showWin', 'openTut', 'closeTut', 'showGame', 'showHome'].forEach(h => {
  const i = s.indexOf('function ' + h + '(');
  if (i < 0) { console.log('MISS hook ' + h); return; }
  const ok = s.slice(i, i + 460).includes('syncBanner()');
  console.log((ok ? 'OK   ' : 'MISS ') + h + ' updates banner');
});
console.log('changed:', s !== before);