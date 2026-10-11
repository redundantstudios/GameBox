'use strict';
const fs = require('fs');

const NOTE = [
  '/* Capped at 1.5 rather than the display ratio. Both games lay down several',
  '   full-screen fills a frame (sky, parallax, chart, fog, vignette), so the cost',
  '   is bound by pixels, not by logic: measured median frame time was 23ms against',
  '   a 16.7ms budget, i.e. over budget on EVERY frame rather than in spikes.',
  '   Dropping 2 -> 1.5 removes about 44% of the pixels those fills touch. */',
  '  DPR=Math.min(window.devicePixelRatio||1,1.5);',
].join('\n');

for (const g of ['orrery', 'ember']) {
  const f = `app/src/main/assets/games/${g}/index.html`;
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace('DPR=Math.min(window.devicePixelRatio||1,2);', NOTE);
  fs.writeFileSync(f, s);
  console.log(g.padEnd(7), /Math\.min\(window\.devicePixelRatio\|\|1,1\.5\)/.test(s) ? 'capped at 1.5' : 'MISS');
}