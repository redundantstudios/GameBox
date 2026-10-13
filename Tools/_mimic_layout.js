'use strict';
const fs = require('fs');
const path = require('path');
const f = path.join('app/src/main/assets/games', 'mimic', 'index.html');
let s = fs.readFileSync(f, 'utf8');

const from =
  'const bpW=104, bpH=42, bpx=Math.max(safe.l+12, playL+10), bpy=safe.t+12;';
const to =
  'const bpW=104, bpH=42;\n' +
  '  /* This card was pinned to the left edge at the same height as the shell back\n' +
  '     button ({x:14,y:safe.t+10,w:42,h:42}) and sat right on top of it, so the\n' +
  '     two drew over each other and neither was readable. It now lives in the top\n' +
  '     right, squared up beside the settings gear with a real gap between them,\n' +
  '     and is clamped so it can never run off the screen edge. */\n' +
  '  const gearX=W-safe.r-40, gearR=22;\n' +
  '  const gap=10;\n' +
  '  const rightEdge=gearX-gearR-gap;\n' +
  '  const bpx=Math.max(safe.l+12, Math.min(rightEdge-bpW, W-safe.r-bpW-12));\n' +
  '  const bpy=safe.t+(gearR+gap/2)-bpH/2;';

if (!s.includes(from)) { console.log('MISS best card position'); process.exit(1); }
s = s.replace(from, to);
fs.writeFileSync(f, s);
console.log('OK   best card moved beside the settings gear');
console.log('checks:');
console.log('  gear-aware  :', /rightEdge=gearX-gearR-gap/.test(s));
console.log('  clamped     :', /W-safe\.r-bpW-12/.test(s));