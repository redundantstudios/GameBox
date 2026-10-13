'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/mimic/index.html';
const raw = fs.readFileSync(f, 'utf8');
const EOL = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r?\n/);

const i = lines.findIndex(l => /updFX\(sdt\); updParticles\(sdt\);/.test(l));
if (i < 0) { console.log('MISS step'); process.exit(1); }
lines.splice(i, 1, '  try{ updateTurnFx(sdt); }catch(e){ sectErr(e); }', lines[i]);
console.log('OK   step drives fx');

const j = lines.findIndex(l => /^\s*inputOn=true; inputIdx=0; overlay=null;\s*$/.test(l));
if (j < 0) { console.log('MISS own'); process.exit(1); }
lines.splice(j, 1,
  '  /* Announce the player, then open the turn. Input stays blocked until the',
  '     card has been read, so the opening placement cannot be skipped. */',
  '  startTurnFx(p.idx,function(){ inputOn=true; inputIdx=0; });',
  '  overlay=null;');
console.log('OK   own pattern turn fx');

fs.writeFileSync(f, lines.join(EOL));
const out = lines.join(EOL);
console.log('step drives fx :', /updateTurnFx\(sdt\)/.test(out));
console.log('own uses fx    :', /startTurnFx\(p\.idx,function\(\)\{ inputOn=true/.test(out));