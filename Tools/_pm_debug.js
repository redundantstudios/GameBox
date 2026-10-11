'use strict';
const fs = require('fs');
const s = fs.readFileSync('app/src/main/assets/games/planetmerge/index.html', 'utf8');
const show = (marker, len) => {
  const i = s.indexOf(marker);
  console.log('--- ' + marker + ' ---');
  console.log(i < 0 ? 'NOT FOUND' : JSON.stringify(s.slice(i, i + len)));
};
show('interstitial(callback){', 340);
show("on($('resetBtn')", 170);
show("on($('backBtn')", 200);