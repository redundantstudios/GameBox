'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/mimic/index.html';
const raw = fs.readFileSync(f, 'utf8');
const EOL = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r?\n/);

const cut = (re, label) => {
  const i = lines.findIndex(l => re.test(l));
  if (i < 0) { console.log('MISS ' + label); return; }
  lines.splice(i, 1);
  console.log('OK   ' + label);
};

const replaceLine = (re, next, label) => {
  const i = lines.findIndex(l => re.test(l));
  if (i < 0) { console.log('MISS ' + label); return; }
  lines.splice(i, 1, ...next);
  console.log('OK   ' + label);
};

/* ISSUE 1: remove the DONE button from settings.
   The sheet already closes on any tap outside the two toggles (line 2226), so
   DONE was a third, redundant way out - and the panel was sized around it. */
replaceLine(/const w2=Math\.min\(W-48,300\), h=272;/,
  ['  /* No DONE button: the sheet closes on any tap outside the two toggles, so a',
   '     third way out was noise. The panel is sized to what is left. */',
   '  const w2=Math.min(W-48,300), h=214;'], 'settings panel height');

replaceLine(/^\s*snd:\{x:x\+30,y:y\+80,w:bw,h:50\},$/,
  ['    snd:{x:x+30,y:y+80,w:bw,h:50},'], 'snd');
replaceLine(/^\s*hap:\{x:x\+30,y:y\+140,w:bw,h:50\},$/,
  ['    hap:{x:x+30,y:y+140,w:bw,h:50}};'], 'hap without done');
cut(/^\s*done:\{x:x\+30,y:y\+h-62,w:bw,h:46\}\};$/, 'done removed');
cut(/clayPill\(g\.done\./, 'done pill removed');
cut(/if\(inR\(g\.done,x,y\)\)/, 'done hit-test removed');

fs.writeFileSync(f, lines.join(EOL));
console.log('\nremaining g.done refs:', (lines.join(EOL).match(/g\.done/g) || []).length);