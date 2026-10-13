'use strict';
const fs = require('fs');
const path = require('path');
const f = path.join('Tools', '_boot_smoke.js');
let s = fs.readFileSync(f, 'utf8');

if (/toDataURL/.test(s)) { console.log('already stubbed'); process.exit(0); }

const i = s.indexOf('getContext: () => ctxStub()');
if (i < 0) { console.log('MISS getContext stub'); process.exit(1); }

// Insert straight after the closing ")," of that line.
const nl = s.indexOf('\n', i);
const ins = '\n    /* Bake-to-data-URL support, for games that pre-render a background\n' +
  '       (Connect Four bakes its intro plank). Node has no canvas, so the 2d\n' +
  '       context is a stub; the element itself still needs the method or the\n' +
  '       smoke run dies on a harness gap rather than anything in the game. */\n' +
  "    toDataURL: () => 'data:image/png;base64,',";
s = s.slice(0, nl) + ins + s.slice(nl);
fs.writeFileSync(f, s);
console.log('OK   toDataURL stub added');