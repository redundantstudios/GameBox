'use strict';
const fs = require('fs');
const L = fs.readFileSync('app/src/main/assets/games/mimic/index.html', 'utf8').split(/\r?\n/);
const show = (re, n, label) => {
  console.log('=== ' + label + ' ===');
  let c = 0;
  L.forEach((l, i) => { if (re.test(l || '') && c++ < (n || 10)) console.log(String(i + 1).padStart(5) + ' | ' + (l || '').trim().slice(0, 108)); });
  console.log('');
};
show(/audio\s*:\s*\{|CFG\s*=\s*\{|master\s*:/, 12, 'CFG.audio');
show(/const MR|MR\s*=|const cx|const cy\s*=|function geom|function playGeom/, 14, 'play geometry');
show(/drawAddFlash\(\)/, 6, 'add flash call');
show(/function clayCircleBtn/, 4, 'clayCircleBtn');
show(/function drawTimerRing|function drawBottom|function drawTiles|tileY|function drawTray/, 12, 'bottom UI');
show(/uiTick\s*=|function uiTick/, 6, 'uiTick');