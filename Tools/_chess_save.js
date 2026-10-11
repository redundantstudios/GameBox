'use strict';
const fs = require('fs');
const s = fs.readFileSync('app/src/main/assets/games/chess/index.html', 'utf8');
const lines = s.split(/\r?\n/);

console.log('=== storage / save plumbing ===');
lines.forEach((l, i) => {
  const t = (l || '').trim();
  if (/Studio\.save|Studio\.load|localStorage|sessionStorage|function save|function load|function persist\b|SAVE_KEY|saveKey/.test(t)) {
    console.log(String(i + 1).padStart(5) + ' | ' + t.slice(0, 92));
  }
});

console.log('\n=== puzzle progress identifiers ===');
lines.forEach((l, i) => {
  const t = (l || '').trim();
  if (/puzzle/i.test(t) && /(save|load|store|stored|progress|persist|unlock|tier|stats)/i.test(t)) {
    console.log(String(i + 1).padStart(5) + ' | ' + t.slice(0, 92));
  }
});