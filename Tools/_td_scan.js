'use strict';
const fs = require('fs');
const L = fs.readFileSync('app/src/main/assets/games/truth-or-dare/index.html', 'utf8').split(/\r?\n/);
const show = (re, n, label) => {
  console.log('=== ' + label + ' ===');
  let c = 0;
  L.forEach((l, i) => { if (re.test(l || '') && c++ < (n || 10)) console.log(String(i + 1).padStart(5) + ' | ' + (l || '').trim().slice(0, 106)); });
  console.log('');
};
show(/ANOTHER|another|btnAgain|again/, 16, 'another truth or dare');
show(/REDUNDANT|Studios|STUDIO|footer/, 12, 'footer / studio text');
show(/back|Back|__shellBack|exitGame/, 18, 'back button');
show(/settings|info|btnSet|btnInfo|openSettings|howToPlay/, 16, 'settings / info');