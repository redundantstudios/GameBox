'use strict';
const fs = require('fs');
const path = require('path');
const F = path.join('app', 'src', 'main', 'assets', 'games', 'mimic', 'index.html');
let s = fs.readFileSync(F, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
const lines = s.split(NL);

/* NOTE: the previous run edited in memory and then process.exit(1) on a later
   miss, so the change was never written. Write unconditionally, report after. */

const start = lines.findIndex(l => l.indexOf('const bs=bests[diffKey].s||0;') >= 0);
if (start < 0) { console.log('MISS best card start'); process.exit(1); }
let end = start;
while (end < lines.length && lines[end].indexOf('UI.best=') < 0) end++;
if (end >= lines.length) { console.log('MISS best card end'); process.exit(1); }

lines.splice(start, end - start + 1,
  '  const bs=bests[diffKey].s||0;',
  '  const bpW=104, bpH=42;',
  '  /* Centred under the HOW TO PLAY button. This card was parked in the top',
  '   right beside the settings gear, reading as a status chip crowding the',
  '   corner controls. It is anchored to the button rather than to the viewport',
  '   (g.howY / g.btnH come from the title geometry), so the two stay together',
  '   at any screen size. */',
  '  const bpx=W/2-bpW/2;',
  '  const bpy=g.howY+g.btnH+20;',
  '  ctx.save();',
  "  ctx.fillStyle='rgba(74,55,40,0.14)'; rr(bpx+2,bpy+7,bpW,bpH,20); ctx.fill();",
  '  ctx.fillStyle=C_DARK; rr(bpx,bpy+4,bpW,bpH,20); ctx.fill();',
  '  ctx.fillStyle=CREAM; rr(bpx,bpy,bpW,bpH,20); ctx.fill();',
  "  ctx.fillStyle='rgba(255,255,255,0.22)'; rr(bpx+8,bpy+5,bpW-16,6,3); ctx.fill();",
  '  ctx.fillStyle=PAL[1]; starAt(ctx,bpx+22,bpy+17,8);',
  "  ctx.font='800 15px '+FONT; ctx.textAlign='left'; ctx.textBaseline='middle';",
  "  ctx.fillStyle=DARK; ctx.fillText(''+bs, bpx+36, bpy+17);",
  "  ctx.font='800 9px '+FONT; ctx.fillStyle='rgba(74,55,40,0.5)';",
  '  ctx.fillText(diffKey.toUpperCase(), bpx+36, bpy+31);',
  '  ctx.restore();',
  '  UI.best={x:bpx-8,y:bpy-8,w:bpW+16,h:bpH+16};');

fs.writeFileSync(F, lines.join(NL));
const out = fs.readFileSync(F, 'utf8');
console.log('OK   best score moved below HOW TO PLAY, centred');
console.log('  verify:', out.indexOf('const bpx=W/2-bpW/2;') >= 0 && out.indexOf('g.howY+g.btnH+20') >= 0);