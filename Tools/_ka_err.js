'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const f = path.join('app', 'src', 'main', 'assets', 'games', 'knot-away', 'index.html');
const s = fs.readFileSync(f, 'utf8');
const m = [...s.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)];
m.forEach((x, i) => {
  try { new vm.Script(x[1], { filename: 'b' + (i + 1) + '.js' }); console.log('OK   block ' + (i + 1)); }
  catch (e) {
    console.log('FAIL block ' + (i + 1) + ': ' + e.message);
    const lm = /b\d\.js:(\d+)/.exec(e.stack || '');
    if (lm) {
      const bl = x[1].split('\n'), ln = +lm[1];
      for (let k = Math.max(0, ln - 8); k < Math.min(bl.length, ln + 3); k++)
        console.log(String(k + 1).padStart(5) + ' | ' + bl[k].slice(0, 104));
    }
  }
});