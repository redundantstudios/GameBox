'use strict';
const fs = require('fs');
for (const g of ['chess', 'checkers']) {
  console.log('=== ' + g + ' ===');
  const s = fs.readFileSync(`app/src/main/assets/games/${g}/index.html`, 'utf8').split(/\r?\n/);
  s.forEach((l, i) => {
    const t = (l || '').trim();
    if (/e\.target===/.test(t)) console.log(String(i + 1).padStart(5) + ' | ' + t.slice(0, 96));
  });
  const close = s.findIndex(l => /function closeModal/.test(l));
  if (close >= 0) {
    console.log('--- closeModal ---');
    for (let k = close; k < close + 5; k++) console.log(String(k + 1).padStart(5) + ' | ' + (s[k] || '').trim().slice(0, 96));
  }
}