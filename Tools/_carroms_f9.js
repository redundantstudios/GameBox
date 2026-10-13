'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join('app', 'src', 'main', 'assets', 'games', 'carroms', 'index.html');
let s = fs.readFileSync(FILE, 'utf8');

/* Replace whatever the previous attempt left, whatever shape it is in. */
const start = s.indexOf('/* Centred deterministically against the viewport');
const altStart = s.indexOf('/* margin:auto 0 centres it reliably');
const from = start >= 0 ? start : altStart;
if (from < 0) { console.log('MISS both variants'); process.exit(1); }
const end = s.indexOf('#adcfYes{', from);
if (end < 0) { console.log('MISS end anchor'); process.exit(1); }

const to =
  '/* Centred deterministically against the viewport. As an overlay flex item this\n' +
  '   panel rendered low in the sheet with its second button off the bottom, while\n' +
  '   every other panel centred fine. `inset:0` + `margin:auto` centres a fixed\n' +
  '   box on both axes with no transform, so the shared pop keyframes cannot fight\n' +
  '   it and the panel never jumps on open. */\n' +
  '#p-adconfirm{\n' +
  '  position:fixed; z-index:60; inset:0; margin:auto;\n' +
  '  width:min(392px, calc(100% - 36px));\n' +
  '  height:fit-content; max-height:calc(100vh - 44px); overflow-y:auto;\n' +
  '  text-align:center; padding:24px 22px 22px;\n' +
  '}\n';

s = s.slice(0, from) + to + s.slice(end);
fs.writeFileSync(FILE, s);
console.log('OK   #p-adconfirm centred via inset:0 + margin:auto');
console.log('  no transform:', !/transform:translate/.test(s.slice(s.indexOf('#p-adconfirm{'), s.indexOf('#adcfYes{'))));