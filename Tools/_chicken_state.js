'use strict';
const fs = require('fs');
const s = fs.readFileSync('app/src/main/assets/games/chicken-chaos/index.html', 'utf8');
const lines = s.split(/\r?\n/);

const hits = [];
lines.forEach((l, i) => {
  const t = l || '';
  const re = /(^|[^\w.$"'])state\b/g;
  let m;
  while ((m = re.exec(t)) !== null) {
    const before = t.slice(Math.max(0, m.index - 24), m.index).replace(/\s+/g, ' ');
    const after = t.slice(m.index, m.index + 34).replace(/\s+/g, ' ');
    hits.push({ line: i + 1, before, after });
  }
});

console.log('bare `state` occurrences:', hits.length);
hits.slice(0, 30).forEach(h => console.log(String(h.line).padStart(5) + ' | ...' + h.before + ' >>> ' + h.after));

console.log('\n=== shell-side "not defined" reporting ===');
const sh = ['app/src/main/java/com/redundantstudios/arcade/GameActivity.kt'];
sh.forEach(f => {
  if (!fs.existsSync(f)) return;
  fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach((l, i) => {
    if (/is not defined|undefined|gameError|Game error|fatal/i.test(l)) {
      console.log('GameActivity ' + (i + 1) + ' | ' + l.trim().slice(0, 88));
    }
  });
});