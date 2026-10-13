'use strict';
const fs = require('fs');
const path = require('path');

const add = (id, fn, label) => {
  const f = path.join('app/src/main/assets/games', id, 'index.html');
  const raw = fs.readFileSync(f, 'utf8');
  const EOL = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split(/\r?\n/);
  const i = lines.findIndex(l => re(fn));
  if (i < 0) { console.log('MISS ' + id + ': ' + label); return; }
  lines.splice(i + 1, 0, '  /* New run: allow the game-over ad again. */',
    '  try{ window.__shellOverAd=0; }catch(e){}');
  fs.writeFileSync(f, lines.join(EOL));
  console.log('OK   ' + id + ': ' + label);
};

const re = (needle) => new RegExp('function\\s+' + needle + '\\s*\\(');

add('knot-away', 'startLevel', 'over-ad reset');
add('truth-or-dare', 'startGame', 'over-ad reset');