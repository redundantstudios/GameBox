'use strict';
const fs = require('fs');
const s = fs.readFileSync('app/src/main/assets/games/knot-away/index.html', 'utf8').split(/\r?\n/);
s.forEach((l, i) => {
  if (/unlock\(\)|Arm the audio|can actually make sound|pause\.home/.test(l || ''))
    console.log(String(i + 1).padStart(5) + ' |' + JSON.stringify(l.slice(0, 104)));
});