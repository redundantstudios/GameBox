'use strict';
const fs = require('fs');
const s = fs.readFileSync('app/src/main/assets/games/checkers/index.html', 'utf8');

for (const id of ['pResume', 'pNew', 'pMenu', 'overPrimary', 'overSecondary']) {
  const marker = '$("' + id + '")';
  const i = s.indexOf(marker);
  console.log('--- ' + id + ' ---');
  if (i < 0) { console.log('  no $() call found'); continue; }
  console.log('  ' + s.slice(i, i + 200).replace(/\s+/g, ' '));
}