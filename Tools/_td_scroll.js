'use strict';
const fs = require('fs');
const path = require('path');
const f = path.join('app/src/main/assets/games', 'truth-or-dare', 'index.html');
let s = fs.readFileSync(f, 'utf8');

if (/#pList\{max-height/.test(s)) { console.log('already applied'); process.exit(0); }

const RULE =
  '/* The player list grows without bound. It had no scroll container at all, so\n' +
  '   past roughly six players the controls below it went off the bottom of the\n' +
  '   screen and nothing could bring them back - the setup page simply stopped\n' +
  '   responding once the count went up. Scrolls here instead. */\n' +
  '#pList{max-height:min(34vh,230px);overflow-y:auto;-webkit-overflow-scrolling:touch;\n' +
  '  padding-right:4px;scrollbar-width:thin}\n' +
  '#pList::-webkit-scrollbar{width:4px}\n' +
  '#pList::-webkit-scrollbar-thumb{background:var(--lime);opacity:.5;border-radius:2px}\n';

const i = s.indexOf('</style>');
if (i < 0) { console.log('MISS </style>'); process.exit(1); }
s = s.slice(0, i) + RULE + s.slice(i);
fs.writeFileSync(f, s);
console.log('OK   pList scrolls');
console.log('     rule present:', /#pList\{max-height:min\(34vh/.test(s));