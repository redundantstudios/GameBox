'use strict';
const fs = require('fs');
const s = fs.readFileSync('app/src/main/assets/games/last-balloon/index.html', 'utf8');

console.log('screen ids:', (s.match(/id="scr-[a-z]+"/g) || []).join(' '));
const i = s.indexOf('/* Banner strip.');
console.log('--- what precedes the shim ---');
console.log(s.slice(Math.max(0, i - 300), i).replace(/\s+/g, ' '));
console.log('--- shim head ---');
console.log(s.slice(i, i + 420));
console.log('--- script blocks ---');
console.log('open :', (s.match(/<script/g) || []).length, ' close:', (s.match(/<\/script>/g) || []).length);