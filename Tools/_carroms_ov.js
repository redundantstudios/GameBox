'use strict';
const fs = require('fs');
const s = fs.readFileSync('app/src/main/assets/games/carroms/index.html', 'utf8').split(/\r?\n/);
s.forEach((l, i) => {
  if (/#overlay\{/.test(l) || /#p-adconfirm\{/.test(l) || /\.panel\{/.test(l)) {
    let j = i;
    while (j < s.length && s[j].indexOf('}') < 0) j++;
    for (let k = i; k <= j; k++) console.log(String(k + 1).padStart(5) + ' | ' + (s[k] || '').trim().slice(0, 108));
    console.log('');
  }
});