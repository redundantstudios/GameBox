'use strict';
const fs = require('fs');
const L = fs.readFileSync('app/src/main/assets/games/mimic/index.html', 'utf8').split(/\r?\n/);
const show = (re, n, label) => {
  console.log('=== ' + label + ' ===');
  let c = 0;
  L.forEach((l, i) => { if (re.test(l || '') && c++ < (n || 8)) console.log(String(i + 1).padStart(5) + ' | ' + (l || '').trim().slice(0, 104)); });
  console.log('');
};
show(/function drawBackArrow|function backBtn|drawBackArrow\(/, 8, 'arrow code now');
show(/REDUNDANT STUDIOS|studio.*version|version:|v3\.0\.0/, 12, 'footer / version');
show(/function titleBackGeom/, 6, 'titleBackGeom');