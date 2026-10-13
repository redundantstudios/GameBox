'use strict';
const fs = require('fs');
const path = require('path');
const F = path.join('app', 'src', 'main', 'assets', 'games', 'mimic', 'index.html');
const NL = fs.readFileSync(F, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const L = fs.readFileSync(F, 'utf8').split(NL);

/* ---------- 1. the original chevron, everywhere ----------
   Three passes of my own arrow were rejected. The director wants the arrow the
   game shipped with: a plain chevron, fixed weight, the one the setup and
   how-to popups have always used. Taken verbatim from
   sources/Playable Games/Mimic.html:

       ctx.strokeStyle=DARK; ctx.lineWidth=3; ctx.lineCap='round'; ctx.lineJoin='round';
       ctx.beginPath(); ctx.moveTo(x+3,y-7); ctx.lineTo(x-4,y); ctx.lineTo(x+3,y+7); ctx.stroke();

   Restored exactly - fixed px, not scaled to the button radius, so it is the
   same glyph at the title button and in the popups. */
{
  const i = L.findIndex(l => /^function drawBackArrow\(x,y,r\)\{/.test((l || '').trim()));
  if (i < 0) { console.log('MISS drawBackArrow'); process.exit(1); }
  let end = i;
  while (end < L.length && L[end].trim() !== '}') end++;
  L.splice(i, end - i + 1,
    '/* The back glyph, restored verbatim from the original game',
    ' * (sources/Playable Games/Mimic.html): a plain chevron at a fixed weight.',
    ' * Three of my own arrows were tried here and all were rejected - one read as',
    ' * a triangle, one pointed right, one drifted off centre - so this is the',
    ' * shipped shape used everywhere, at the same size in every button. */',
    'function drawBackArrow(x,y){',
    "  ctx.strokeStyle=DARK; ctx.lineWidth=3; ctx.lineCap='round'; ctx.lineJoin='round';",
    '  ctx.beginPath(); ctx.moveTo(x+3,y-7); ctx.lineTo(x-4,y); ctx.lineTo(x+3,y+7); ctx.stroke();',
    '}');
  console.log('OK   drawBackArrow restored to the original chevron');

  // the two call sites passed a radius the new signature does not take
  const a = L.findIndex(l => /drawBackArrow\(x,y,g\.back\.r\);/.test(l || ''));
  if (a >= 0) { L.splice(a, 1, '    drawBackArrow(x,y);'); console.log('OK   backBtn call updated'); }
  const b = L.findIndex(l => /drawBackArrow\(x,y,r\.w\/2\);/.test(l || ''));
  if (b >= 0) { L.splice(b, 1, '      drawBackArrow(x,y);'); console.log('OK   title call updated'); }
}

/* ---------- 2. footer: studio only, no version ---------- */
{
  const i = L.findIndex(l => /CFG\.branding\.studio\+'   -   '\+CFG\.branding\.version/.test(l || ''));
  if (i < 0) { console.log('MISS footer'); process.exit(1); }
  L.splice(i, 1,
    "  /* Studio credit only. The version stamp was clutter on a published game. */",
    '  ctx.fillText(CFG.branding.studio, W/2, g.footerY);');
  console.log('OK   footer is REDUNDANT STUDIOS only');
}

fs.writeFileSync(F, L.join(NL));
const out = fs.readFileSync(F, 'utf8');
console.log('\nchecks:');
console.log('  original chevron :', /moveTo\(x\+3,y-7\); ctx\.lineTo\(x-4,y\); ctx\.lineTo\(x\+3,y\+7\)/.test(out));
console.log('  lineWidth 3      :', /ctx\.lineWidth=3; ctx\.lineCap='round'/.test(out));
console.log('  both call sites  :', (out.match(/drawBackArrow\(x,y\);/g) || []).length === 2);
console.log('  no radius scaling:', !/drawBackArrow\(x,y,r\)/.test(out));
console.log('  footer clean     :', !/branding\.version/.test(out));