'use strict';
const fs = require('fs');
const s = fs.readFileSync('app/src/main/assets/games/carroms/index.html', 'utf8').split(/\r?\n/);
const show = (re, n, label) => {
  console.log('=== ' + label + ' ===');
  let c = 0;
  s.forEach((l, i) => { if (re.test(l || '') && c++ < (n || 10)) console.log(String(i + 1).padStart(5) + ' | ' + (l || '').trim().slice(0, 104)); });
  console.log('');
};
show(/renderProfiles\(\);|audioEnsure\(\);/, 10, 'renderProfiles / audioEnsure call sites');
show(/bTheme|p-theme'|id="p-theme"|\.backbtn|bThemeBack/, 10, 'theme page + back buttons');
show(/function showHome|loadState\(\);|window\.Game\s*=|^loadState/, 8, 'boot / showHome');