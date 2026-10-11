'use strict';
const fs = require('fs');
const s = fs.readFileSync('app/src/main/assets/games/chicken-chaos/index.html', 'utf8');
const a = s.indexOf('var bannerOn=false;');
console.log('=== banner poll block (raw) ===');
console.log(JSON.stringify(s.slice(a - 320, a + 240)));
const b = s.indexOf('banner(visible)');
console.log('\n=== banner helper (raw) ===');
console.log(JSON.stringify(s.slice(b - 30, b + 260)));