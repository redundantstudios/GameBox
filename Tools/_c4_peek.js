'use strict';
const fs = require('fs');
const s = fs.readFileSync('app/src/main/assets/games/connect-four/index.html', 'utf8');
const lines = s.split(/\r?\n/);
console.log('--- 1189..1194 raw ---');
for (let k = 1188; k < 1194; k++) {
  console.log(k + 1, JSON.stringify(lines[k]));
}