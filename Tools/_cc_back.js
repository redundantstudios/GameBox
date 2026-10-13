'use strict';
const fs = require('fs');
const s = fs.readFileSync('app/src/main/assets/games/chinese-checkers/index.html', 'utf8');
console.log('markup  :', /id="btnBack"/.test(s) ? 'present' : 'MISSING');
const j = s.indexOf("var bk=$('btnBack')");
console.log('handler :', j >= 0 ? JSON.stringify(s.slice(j, j + 140)) : 'MISSING');