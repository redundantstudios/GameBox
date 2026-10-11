'use strict';
const fs = require('fs');
const s = fs.readFileSync('app/src/main/assets/games/planetmerge/index.html', 'utf8');
for (const id of ['againBtn', 'backBtn', 'resetBtn']) {
  const i = s.indexOf("on($('" + id + "')");
  console.log('--- ' + id + ' ---');
  console.log(i < 0 ? 'NOT FOUND' : s.slice(i, i + 230).replace(/\s+/g, ' '));
}
console.log('--- resetGame / toStart refs ---');
const r = s.indexOf('function resetGame');
console.log(s.slice(r, r + 60));
const t = s.indexOf("function introBack");
console.log(s.slice(t, t + 200).replace(/\s+/g, ' '));