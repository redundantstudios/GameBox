'use strict';
const fs = require('fs');
const h = fs.readFileSync('app/src/main/assets/games/knot-away/index.html', 'utf8');
const L = h.split(/\r?\n/);
const show = (re, n, label) => {
  console.log('=== ' + label + ' ===');
  let c = 0;
  L.forEach((l, i) => { if (re.test(l || '') && c++ < (n || 8)) console.log(String(i + 1).padStart(5) + ' | ' + (l || '').trim().slice(0, 110)); });
  console.log('');
};
show(/id="panel-unlockad"/, 2, 'panel markup present?');
show(/id="btnUaGo"|id="btnUaNo"|id="uaNum"|id="uaMsg"/, 6, 'confirm sheet elements');
show(/^<div class="panel"/, 12, 'all panels in order');
show(/function openPanel/, 6, 'openPanel');
show(/if\(adOK\)\{ openAdConfirm/, 4, 'tile click -> confirm');
show(/panel-unlockad|unlockad/, 8, 'openPanel target name');