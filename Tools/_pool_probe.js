/* Where does pool-8ball end a game, and where does it keep the potted balls? */
'use strict';
const fs = require('fs');
const path = require('path');
const f = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'games', 'pool-8ball', 'index.html');
const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);

console.log('--- game end ---');
for (let i = 0; i < lines.length; i++) {
  const l = lines[i] || '';
  if (/state\s*=\s*['"]over['"]/.test(l) || /function\s+(endGame|gameOver|finishGame|onEnd)\b/.test(l)) {
    console.log(String(i + 1).padStart(5) + ' | ' + l.trim().slice(0, 105));
  }
}

console.log('\n--- banner / potted-ball containers ---');
for (let i = 0; i < lines.length; i++) {
  const l = lines[i] || '';
  if (/id=['"](banner|pot\w*|balls?\w*)['"]/.test(l) || /potted/i.test(l)) {
    console.log(String(i + 1).padStart(5) + ' | ' + l.trim().slice(0, 95));
  }
}