'use strict';
const fs = require('fs');
const path = require('path');
const NL = f => fs.readFileSync(f, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const KA = path.join('app', 'src', 'main', 'assets', 'games', 'knot-away', 'index.html');
const MI = path.join('app', 'src', 'main', 'assets', 'games', 'mimic', 'index.html');

/* 1. orphan "}" left by the startAdTick splice (the marker excluded the closer) */
{
  const L = fs.readFileSync(KA, 'utf8').split(NL(KA));
  const i = L.findIndex(l => /adTickId=setInterval\(tick,1000\);/.test((l || '').trim()));
  if (i < 0) { console.log('MISS setInterval'); process.exit(1); }
  console.log('before: ' + L[i + 1].trim() + ' / ' + (L[i + 2] || '').trim());
  if (L[i + 2] !== undefined && L[i + 2].trim() === '}') {
    L.splice(i + 2, 1);
    console.log('OK   orphan "}" removed');
  } else console.log('nothing to remove');
  // tidy the doubled comment while we are here
  const c = L.findIndex(l => /Is this the level the current ad grant opened/.test(l || ''));
  if (c >= 0) L.splice(c, 2);
  fs.writeFileSync(KA, L.join(NL(KA)));
}

/* 2. MIMIC back arrow: bolder head, wider angle, shorter tail.
      The previous stroke was thin against a large chevron, which read as an
      acute "<" with a stick rather than as a back arrow. */
{
  const L = fs.readFileSync(MI, 'utf8').split(NL(MI));
  const i = L.findIndex(l => /^function drawBackArrow\(x,y,r\)\{/.test((l || '').trim()));
  if (i < 0) { console.log('MISS drawBackArrow'); process.exit(1); }
  let end = i;
  while (end < L.length && L[end].trim() !== '}') end++;
  L.splice(i, end - i + 1,
    '/* The back glyph, pointing left.',
    ' *',
    ' * Bolder than a plain chevron on purpose: the earlier version used a thin',
    ' * stroke against a tall head, which read as an acute "<" with a stick rather',
    ' * than as a back arrow. Wider head angle, heavier stroke, shorter tail -',
    ' * symmetric about x so it sits centred in the clay button. */',
    'function drawBackArrow(x,y,r){',
    '  ctx.save();',
    '  ctx.strokeStyle=DARK;',
    '  ctx.lineWidth=Math.max(2.9,r*0.155);',
    "  ctx.lineCap='round'; ctx.lineJoin='round';",
    '  const Lf=r*0.70, T=r*0.24, h=r*0.54;',
    '  /* tail, running out to the right */',
    '  ctx.beginPath(); ctx.moveTo(x+Lf,y); ctx.lineTo(x-Lf*0.12,y); ctx.stroke();',
    '  /* head, apex on the left */',
    '  ctx.beginPath(); ctx.moveTo(x+T,y-h); ctx.lineTo(x-Lf,y); ctx.lineTo(x+T,y+h); ctx.stroke();',
    '  ctx.restore();',
    '}');
  fs.writeFileSync(MI, L.join(NL(MI)));
  console.log('\nOK   mimic arrow: heavier, wider head, shorter tail');
}