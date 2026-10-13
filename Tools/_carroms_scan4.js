'use strict';
const fs = require('fs');
const s = fs.readFileSync('app/src/main/assets/games/carroms/index.html', 'utf8').split(/\r?\n/);
const show = (re, n, label) => {
  console.log('=== ' + label + ' ===');
  let c = 0;
  s.forEach((l, i) => { if (re.test(l || '') && c++ < (n || 12)) console.log(String(i + 1).padStart(5) + ' | ' + (l || '').trim().slice(0, 108)); });
  console.log('');
};
show(/S\('click'\)/, 12, "every S('click') call site");
show(/function renderProfiles/, 20, 'renderProfiles');
show(/tutBack/, 8, 'tutBack wiring');
show(/const Tutorial=\{|Tutorial=\{/, 18, 'Tutorial object');