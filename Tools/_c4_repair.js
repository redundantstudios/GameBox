'use strict';
const fs = require('fs');
const path = require('path');
const f = path.join('app', 'src', 'main', 'assets', 'games', 'connect-four', 'index.html');
let s = fs.readFileSync(f, 'utf8');
const CRLF = s.includes('\r\n');
const lines = s.split(/\r?\n/);

/* Locate the marker and the function that follows it. Everything between them
   is the orphaned remains of onWin()/onDraw(); their signatures are gone. */
const strikeAt = lines.findIndex(l => /^let strike=null;$/.test(l));
const showAt = lines.findIndex(l => /^function showPlaque\(p\)\{/.test(l));
if (strikeAt < 0 || showAt < 0 || showAt <= strikeAt) {
  console.log('MISS strike=%d show=%d', strikeAt, showAt); process.exit(1);
}

const rebuilt = [
  'function onWin(m){',
  "  S.phase='over';S.pending=null;S.thinking=false;aiId++;",
  '  S.winCells=m.winCells;S.win=m.p;',
  '  S.score[m.p-1]++;clearSave();',
  '  const cells=m.winCells.slice().sort((a,b)=>(a[0]*31+a[1])-(b[0]*31+b[1]));',
  '  const a=cells[0],b2=cells[cells.length-1];',
  '  let x1=cx(a[0]),y1=yOfGr(a[1]),x2=cx(b2[0]),y2=yOfGr(b2[1]);',
  '  const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L,e=26;',
  '  strike={x1:x1-ux*e,y1:y1-uy*e,x2:x2+ux*e,y2:y2+uy*e,p:m.p,t:0};',
  '  SFX.win();vibrate([20,40,20,60]);',
  '  const seq=++S.seq;',
  '  /* Panel first, ad the instant after - not ad-then-panel. */',
  '  setTimeout(function(){',
  '    if(seq!==S.seq)return;',
  '    showPlaque(m.p);',
  "    setTimeout(function(){ shellAd(function(){},'connectfour.over.win'); },260);",
  '  },1050);',
  '  refreshUI();',
  '}',
  'function onDraw(){',
  "  S.phase='over';S.pending=null;S.win=0;S.thinking=false;aiId++;",
  '  clearSave();SFX.drawSnd();vibrate(30);',
  '  const seq=++S.seq;',
  '  /* Same order as a win: panel first, ad immediately after. */',
  '  setTimeout(function(){',
  '    if(seq!==S.seq)return;',
  '    showPlaque(0);',
  "    setTimeout(function(){ shellAd(function(){},'connectfour.over.draw'); },260);",
  '  },800);',
  '  refreshUI();',
  '}',
];

lines.splice(strikeAt + 1, showAt - strikeAt - 1, ...rebuilt);
fs.writeFileSync(f, lines.join(CRLF));
console.log('OK   rebuilt onWin/onDraw (' + (showAt - strikeAt - 1) + ' lines -> ' + rebuilt.length + ')');