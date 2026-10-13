'use strict';
const fs = require('fs');
const L = fs.readFileSync('app/src/main/assets/games/chess/index.html', 'utf8').split(/\r?\n/);
const show = (re, n, label) => {
  console.log('=== ' + label + ' ===');
  let c = 0;
  L.forEach((l, i) => { if (re.test(l || '') && c++ < (n || 8)) console.log(String(i + 1).padStart(5) + ' | ' + (l || '').trim().slice(0, 104)); });
  console.log('');
};
show(/id="testAd"|testAd\b|taBody/, 12, 'test ad panel elements');
show(/showTestAd|openTestAd|testAdEl\.classList|addEventListener.*test/i, 10, 'what opens it');
show(/panel-test|class="panel" id="testAd"/, 6, 'panel markup');