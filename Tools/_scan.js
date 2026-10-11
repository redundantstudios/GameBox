'use strict';
const fs = require('fs');
const g = process.argv[2] || 'colour-rush';
const pats = process.argv.slice(3).length
  ? process.argv.slice(3).map(p => new RegExp(p, 'i'))
  : [/AudioContext|gestureSeen|unlockAudio|Snd\.init|Audio\.init|resume\(\)/];
const s = fs.readFileSync(`app/src/main/assets/games/${g}/index.html`, 'utf8').split(/\r?\n/);
s.forEach((l, i) => {
  const t = (l || '').trim();
  if (pats.some(p => p.test(t))) console.log(String(i + 1).padStart(5) + ' | ' + t.slice(0, 92));
});