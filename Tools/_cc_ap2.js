'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/chinese-checkers/index.html';
let s = fs.readFileSync(f, 'utf8');
const re = /\s*var auto=autoPath\(\);\s*\r?\n\s*if\(!auto\)\{try\{window\.__ccSyncBanner\(\)\}catch\(e\)\{\}\}/;
if (!re.test(s)) { console.log('MISS'); process.exit(1); }
s = s.replace(re, '\n    try{window.__ccSyncBanner()}catch(e){}');
fs.writeFileSync(f, s);
console.log('autoPath call removed:', !/autoPath\(\)/.test(s));