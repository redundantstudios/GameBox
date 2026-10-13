'use strict';
const fs = require('fs');
const path = require('path');
const f = path.join('app/src/main/assets/games', 'connect-four', 'index.html');
let s = fs.readFileSync(f, 'utf8');

if (/volume\(\)\{ return vol; \},,/.test(s)) {
  s = s.replace('volume(){ return vol; },,', 'volume(){ return vol; },');
  fs.writeFileSync(f, s);
  console.log('OK   doubled comma removed');
} else console.log('     no doubled comma found');
console.log('clean:', !/,\s*,/.test(s.match(/return\{[\s\S]{0,400}/)?.[0] || ''));