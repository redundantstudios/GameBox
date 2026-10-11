'use strict';
const fs = require('fs');
const s = fs.readFileSync('app/src/main/assets/games/ludo/index.html', 'utf8');
const lines = s.split(/\r?\n/);

console.log('=== over popup + buttons (2210-2232) ===');
for (let k = 2209; k < 2232; k++) console.log(String(k + 1).padStart(5) + ' | ' + (lines[k] || '').trim().slice(0, 96));

console.log('\n=== how buttons are bound ===');
lines.forEach((l, i) => {
  const t = (l || '').trim();
  if (/\.onclick\s*=|addEventListener\(['"]click|function bindBtn|BTN\[|btn\.addEvent/.test(t)) {
    console.log(String(i + 1).padStart(5) + ' | ' + t.slice(0, 92));
  }
});

console.log('\n=== winner decided (738-750) ===');
for (let k = 737; k < 750; k++) console.log(String(k + 1).padStart(5) + ' | ' + (lines[k] || '').trim().slice(0, 92));