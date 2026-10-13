'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join('app', 'src', 'main', 'assets', 'games', 'connect-four', 'index.html');
let s = fs.readFileSync(FILE, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
let lines = s.split(NL);

function swapExact(mustContain, endContains, replacement, label) {
  let i = -1;
  for (let k = 0; k < lines.length; k++) if (lines[k].includes(mustContain)) { i = k; break; }
  if (i < 0) { console.log('MISS start  ' + label); return; }
  if (lines[i].includes(endContains)) {
    lines.splice(i, 1, ...replacement);
  } else {
    let j = i;
    while (j < lines.length && !lines[j].includes(endContains)) j++;
    if (j >= lines.length) { console.log('MISS end    ' + label); return; }
    lines.splice(i, j - i + 1, ...replacement);
  }
  console.log('OK   ' + label);
}

/* 3 bounces instead of 4 */
swapExact('if(sp>m.minv&&m.b<4){', 'if(sp>m.minv&&m.b<4){',
  ['          if(sp>m.minv&&m.b<3){'], 'landing: 3 bounces not 4');

/* win: panel first, ad immediately after */
swapExact("shellAd(function(){ setTimeout(function(){ if(seq===S.seq) showPlaque(m.p); },1050); },'connectfour.over.win');",
  "'connectfour.over.win');",
  [
    '  /* Panel first, ad the instant after - not ad-then-panel. */',
    '  setTimeout(function(){',
    '    if(seq!==S.seq)return;',
    '    showPlaque(m.p);',
    "    setTimeout(function(){ shellAd(function(){},'connectfour.over.win'); },260);",
    '  },1050);',
  ],
  'win: panel then ad');

/* draw: same order */
swapExact("shellAd(function(){ setTimeout(function(){ if(seq===S.seq) showPlaque(0); },800); },'connectfour.over.draw');",
  "'connectfour.over.draw');",
  [
    '  /* Same order as a win: panel first, ad immediately after. */',
    '  setTimeout(function(){',
    '    if(seq!==S.seq)return;',
    '    showPlaque(0);',
    "    setTimeout(function(){ shellAd(function(){},'connectfour.over.draw'); },260);",
    '  },800);',
  ],
  'draw: panel then ad');

/* intro background: JPEG */
swapExact("introEl.style.backgroundImage='url('+cn.toDataURL('image/png')+')';",
  "toDataURL('image/png')",
  [
    '  /* JPEG not PNG: a painted plank gains nothing from a lossless encode, and',
    '     the JPEG encode of the same canvas is several times faster. */',
    "  introEl.style.backgroundImage='url('+cn.toDataURL('image/jpeg',0.9)+')';",
  ],
  'intro background: JPEG encode');

fs.writeFileSync(FILE, lines.join(NL));
console.log('\nwritten (' + lines.length + ' lines)');