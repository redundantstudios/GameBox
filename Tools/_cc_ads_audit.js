'use strict';
const fs = require('fs');
const s = fs.readFileSync('app/src/main/assets/games/chinese-checkers/index.html', 'utf8');
const lines = s.split(/\r?\n/);

console.log('=== every button in the game ===');
lines.forEach((l, i) => {
  const m = /id="(btn[A-Za-z]+)"/.exec(l);
  if (!m) return;
  const id = m[1];
  const ctx = lines.slice(i, i + 3).join(' ') + ' ' +
    (s.slice(s.indexOf("'" + id + "'") + 2) || '').slice(0, 0);
  // find the handler assignment for this id
  let handler = 'n/a';
  const h = new RegExp("\\$\\('" + id + "'\\)[\\s\\S]{0,220}").exec(s);
  if (h) {
    handler = /interstitial/.test(h[0]) ? 'AD   ' : 'no-ad';
    handler += '  ' + h[0].replace(/\s+/g, ' ').slice(0, 96);
  }
  console.log(String(i + 1).padStart(5) + ' | ' + id.padEnd(12) + ' | ' + handler);
});

console.log('\n=== placements in use ===');
const seen = new Set();
(s.match(/'chinesecheckers\.[a-z.]+'/g) || []).forEach(p => seen.add(p));
[...seen].forEach(p => console.log('  ' + p));