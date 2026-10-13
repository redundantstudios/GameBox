'use strict';
const fs = require('fs');
const s = fs.readFileSync('sources/Playable Games/Mimic.html', 'utf8');
const lines = s.split(/\r?\n/);
console.log('=== input handlers ===');
lines.forEach((l, i) => {
  const t = (l || '').trim();
  if (/addEventListener\('(pointerdown|touchstart|click|mousedown)'/.test(t)) {
    console.log(String(i + 1).padStart(5) + ' | ' + t.slice(0, 92));
  }
});
console.log('\n=== boot / resize / loop start ===');
lines.forEach((l, i) => {
  const t = (l || '').trim();
  if (/function (boot|start|resize|onResize|setMode|openSetup)|requestAnimationFrame\(frame\)|addEventListener\('resize'/.test(t)) {
    console.log(String(i + 1).padStart(5) + ' | ' + t.slice(0, 92));
  }
});
console.log('\n=== hit-test dispatch ===');
lines.forEach((l, i) => {
  const t = (l || '').trim();
  if (/\.resume\b|\.restart\b|\.quit\b|\.retry\b|\.home\b|\.again\b|\.home2\b|\.snd\b|\.hap\b/.test(t) && /hit|push|tap|click|if\(/.test(t)) {
    console.log(String(i + 1).padStart(5) + ' | ' + t.slice(0, 96));
  }
});