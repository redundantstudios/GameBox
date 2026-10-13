'use strict';
const fs = require('fs');
const s = fs.readFileSync('app/src/main/assets/games/carroms/index.html', 'utf8').split(/\r?\n/);
const i = s.findIndex(l => l.indexOf("$('#adcfYes')") >= 0);
console.log('--- adcf handlers, lines ' + (i + 1) + ' onward ---');
for (let k = i; k < i + 24; k++) console.log(String(k + 1).padStart(5) + ' |' + JSON.stringify(s[k]));