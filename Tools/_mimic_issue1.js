'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/mimic/index.html';
let s = fs.readFileSync(f, 'utf8');

const swap = (from, to, label) => {
  const re = from instanceof RegExp ? from : new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  if (!re.test(s)) { console.log('MISS ' + label); return; }
  s = s.replace(re, to);
  console.log('OK   ' + label);
};

/* ---- ISSUE 1: "remove done btn in settings" ----
   settingsGeom has snd, hap and done. The overlay already leaves on any tap
   outside the two toggles, so DONE was a third way to do the same thing. */
swap(
  /function settingsGeom\(\)\{\r?\n  var w2=Math\.min\(W-48,300\), h=272;[\s\S]{0,320}?done:\{x:x\+30,y:y\+h-62,w:bw,h:46\}\};\r?\n\}/,
  'function settingsGeom(){\n' +
  '  /* No DONE button: the sheet closes on any tap outside the two toggles, so a\n' +
  '     third way out was noise. The panel is shorter to match. */\n' +
  '  var w2=Math.min(W-48,300), h=222;\n' +
  '  const x=Math.round(W/2-w2/2), y=Math.round(H/2-h/2);\n' +
  '  const bw=w2-60;\n' +
  "  return {w:w2,h:h,x:x,y:y, back:{x:x+28,y:y+38,r:17},\n" +
  '    snd:{x:x+30,y:y+80,w:bw,h:50},\n' +
  '    hap:{x:x+30,y:y+140,w:bw,h:50}};\n' +
  '}',
  'settings DONE removed');

fs.writeFileSync(f, s);

const check = [
  ['no DONE in settingsGeom', !/done:\{x:x\+30,y:y\+h-62/.test(s)],
  ['no g.done hit-test', !/inR\(g\.done/.test(s)],
];
check.forEach(([k, v]) => console.log((v ? 'OK   ' : 'MISS ') + k));

/* the DONE hit-test may live elsewhere - report where */
s.split(/\r?\n/).forEach((l, i) => {
  if (/g\.done\b/.test(l)) console.log('  remaining g.done @' + (i + 1) + ': ' + l.trim().slice(0, 80));
});