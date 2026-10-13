'use strict';
const fs = require('fs');
const G = {
  'knot-away': 'sources/Playable Games/knot Away.html',
  'carroms': 'sources/Playable Games/carromsNew.html',
  'truth-or-dare': 'sources/Playable Games/truthOrDare.html',
};
const want = [
  /function\s+(show|open|hide|close)(Home|Menu|Pause|Game|Over|Board|Table|Result|Levels)\w*/i,
  /function\s+(gameOver|endGame|finish|win|lose|over|gameEnd)\w*/i,
  /function\s+(newGame|startGame|startMatch|startRound|restart|reset)\w*/i,
  /(scr-home|scrHome|showScreen|setScreen|switchScreen)\s*[=(]/,
];

for (const [id, p] of Object.entries(G)) {
  console.log('===== ' + id + ' =====');
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  lines.forEach((l, i) => {
    const t = (l || '').trim();
    if (want.some(r => r.test(t)) && t.length < 150) {
      console.log(String(i + 1).padStart(5) + ' | ' + t.slice(0, 104));
    }
  });
  console.log('');
}