'use strict';
const fs = require('fs');
const s = fs.readFileSync('app/src/main/assets/games/mimic/index.html', 'utf8').split(/\r?\n/);
const show = (re, n, label) => {
  console.log('=== ' + label + ' ===');
  let c = 0;
  s.forEach((l, i) => { if (re.test(l || '') && c++ < (n || 8)) console.log(String(i + 1).padStart(5) + ' | ' + (l || '').trim().slice(0, 104)); });
  console.log('');
};
show(/ADD A TILE|addTile|add-tile|patternTxt|modeTxt|statusTxt|__shellBackBtn=btn|innerHTML='&#8249;'|&#8249;/, 10, 'add-tile text / back btn');
show(/drawGhost|drawTray|UI\.best|best.*=.*\{x:|bests\[diffKey\]/, 10, 'best score / ghost');
show(/mode\s*===\s*'(last|own|mimi)'|diffKey|function modeLabel|labelFor|case 'last'/, 10, 'mode labels');