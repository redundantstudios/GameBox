'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join('app', 'src', 'main', 'assets', 'games', 'carroms', 'index.html');
let s = fs.readFileSync(FILE, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
let lines = s.split(NL);

const i = lines.findIndex(l => l.includes("var on=(window.__shellScreen==='home');"));
if (i < 0) { console.log('MISS back poll'); process.exit(1); }

lines.splice(i, 1,
  "  /* Start page ONLY. A settings/theme panel is an overlay drawn on top of the",
  '   * start page rather than its own screen, so __shellScreen is still \'home\'',
  '   * while one is open - the button has to hide for those too, or it floats',
  '   * over every panel. */',
  "  var on=(window.__shellScreen==='home')&&!Panels.isOpen();");

fs.writeFileSync(FILE, lines.join(NL));
console.log('OK   back button hides behind panels too');