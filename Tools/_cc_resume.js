'use strict';
const fs = require('fs');
const s = fs.readFileSync('app/src/main/assets/games/chicken-chaos/index.html', 'utf8');
const i = s.indexOf("uiBtn('res'");
console.log(JSON.stringify(s.slice(i, i + 240)));