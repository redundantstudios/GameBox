'use strict';
const fs = require('fs');
const path = require('path');
const s = fs.readFileSync(path.join('app/src/main/assets/games', 'carroms', 'index.html'), 'utf8');
const lines = s.split(/\r?\n/);

console.log('=== theme / locked / unlock ===');
lines.forEach((l, i) => {
  const t = (l || '').trim();
  if (/theme|locked|unlock|proSkin|boardTheme|chip|owned/i.test(t) && t.length < 160) {
    console.log(String(i + 1).padStart(5) + ' | ' + t.slice(0, 100));
  }
});
console.log('\n=== audio / volume ===');
lines.forEach((l, i) => {
  const t = (l || '').trim();
  if (/gain\.value|AudioSys|CFG\.audio|master|music/i.test(t) && t.length < 160) {
    console.log(String(i + 1).padStart(5) + ' | ' + t.slice(0, 100));
  }
});
console.log('\n=== back / theme page ===');
lines.forEach((l, i) => {
  const t = (l || '').trim();
  if (/backBtn|themePage|scr-theme|showScreen|setScreen|\bscreen\s*=/i.test(t) && t.length < 160) {
    console.log(String(i + 1).padStart(5) + ' | ' + t.slice(0, 100));
  }
});