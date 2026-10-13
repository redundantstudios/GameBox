'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join('app', 'src', 'main', 'assets', 'games', 'carroms', 'index.html');
let s = fs.readFileSync(FILE, 'utf8');

const from = '#p-adconfirm{text-align:center;padding:26px 22px 22px}';
const to =
  '/* margin:auto 0 centres it reliably in the overlay flex column regardless of\n' +
  "   align-items, and the max-height keeps the two buttons on screen. Without\n" +
  '   these it rendered low in the panel and the second button ran off. */\n' +
  '#p-adconfirm{text-align:center;padding:24px 22px 22px;margin:auto 0;' +
  'max-height:calc(100% - 20px);align-self:center}';

if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, to);
fs.writeFileSync(FILE, s);
console.log('OK   #p-adconfirm centred and height-capped');