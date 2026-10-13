'use strict';
const fs = require('fs');
const path = require('path');
const f = path.join('app', 'src', 'main', 'assets', 'games', 'connect-four', 'index.html');
let s = fs.readFileSync(f, 'utf8');
const CRLF = s.includes('\r\n');

/* Replace the line matching startRe through the line matching endRe (inclusive). */
const replaceLines = (startRe, endRe, replacement, label) => {
  const lines = s.split(/\r?\n/);
  let i = -1;
  for (let k = 0; k < lines.length; k++) if (startRe.test(lines[k])) { i = k; break; }
  if (i < 0) { console.log('MISS start ' + label); return; }
  let j = i;
  while (j < lines.length && !endRe.test(lines[j])) j++;
  if (j >= lines.length) { console.log('MISS end ' + label); return; }
  lines.splice(i, j - i + 1, ...replacement);
  s = lines.join(CRLF ? '\r\n' : '\n');
  console.log('OK   ' + label);
};

/* impact(): full particle burst only on the first landing. */
replaceLines(
  /^ {2}spark\(X,Y,m\.p===1\?/,
  /^ {2}ring\(X,Y,\(m\.p===1\?/,
  [
    '  /* The full burst belongs to the FIRST landing. Every later bounce fired',
    '     the same spark + wood-dust + ring set, so one drop could spray five',
    '     bursts and jolt the whole board five times as the marble settled. */',
    '  const nf=first?1:.32;',
    "  spark(X,Y,m.p===1?'rgba(190,235,255,.95)':'rgba(255,225,160,.95)',",
    '    Math.max(1,Math.round((3+pow*9)*nf)),(.5+pow)*nf);',
    '  if(first&&pow>.55)woodDust(X,Y,4+Math.round(pow*5));',
    "  if(first)ring(X,Y,(m.p===1?'rgba(120,190,255,':'rgba(255,190,110,')+'0.6)');",
  ],
  'landing: full burst only on first contact');

/* onWin() and onDraw(): show the panel, then request the ad straight after. */
const order = (fnRe, who, expr, ms, placement) => replaceLines(
  fnRe,
  /shellAd\(function\(\)\{ setTimeout/,
  [
    '  /* Panel first, ad the instant after - not ad-then-panel. */',
    '  setTimeout(function(){',
    '    if(seq!==S.seq)return;',
    '    showPlaque(' + expr + ');',
    "    setTimeout(function(){ shellAd(function(){},'" + placement + "'); },260);",
    '  },' + ms + ');',
  ],
  who + ': panel then ad');

order(/^function onWin\(m\)\{/, 'win', 'm.p', '1050', 'connectfour.over.win');
order(/^function onDraw\(\)\{/, 'draw', '0', '800', 'connectfour.over.draw');

/* intro background: JPEG encode instead of PNG. */
{
  const lines = s.split(/\r?\n/);
  const i = lines.findIndex(l => l.includes("introEl.style.backgroundImage='url('+cn.toDataURL("));
  if (i < 0) console.log('MISS intro background');
  else {
    lines.splice(i, 1,
      '  /* JPEG rather than PNG: a painted plank texture gains nothing from a',
      '     lossless encode, and toDataURL("image/jpeg") is several times faster. */',
      "  introEl.style.backgroundImage='url('+cn.toDataURL('image/jpeg',0.9)+')';");
    s = lines.join(CRLF ? '\r\n' : '\n');
    console.log('OK   intro background: JPEG encode');
  }
}

fs.writeFileSync(f, s);
console.log('\nchecks:');
console.log('  burst only first :', /const nf=first\?1:\.32;/.test(s));
console.log('  win  panel->ad   :', /showPlaque\(m\.p\);\r?\n\s*setTimeout\(function\(\)\{ shellAd\(function\(\)\{\},'connectfour\.over\.win'\)/.test(s));
console.log('  draw panel->ad   :', /showPlaque\(0\);\r?\n\s*setTimeout\(function\(\)\{ shellAd\(function\(\)\{\},'connectfour\.over\.draw'\)/.test(s));
console.log('  jpeg intro bg    :', /toDataURL\('image\/jpeg',0\.9\)/.test(s));
console.log('  no ad-wrap left  :', !/shellAd\(function\(\)\{ setTimeout/.test(s));