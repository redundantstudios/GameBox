'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const f = path.join('app/src/main/assets/games', 'connect-four', 'index.html');
const s = fs.readFileSync(f, 'utf8');

const re = /<script[^>]*>([\s\S]*?)<\/script>/gi;
let m, n = 0;
while ((m = re.exec(s))) {
  n++;
  const body = m[1];
  const startLine = s.slice(0, m.index).split('\n').length;
  try {
    new vm.Script(body, { filename: 'block' + n + '.js' });
    console.log('OK   block ' + n + ' (html line ' + startLine + ')');
  } catch (e) {
    console.log('FAIL block ' + n + ' (html line ' + startLine + '): ' + e.message);
    const stack = (e.stack || '').split('\n');
    console.log(stack.slice(0, 6).join('\n'));
    // Show the offending region.
    const lm = /block\d+\.js:(\d+)/.exec(e.stack || '');
    if (lm) {
      const ln = +lm[1];
      const bl = body.split('\n');
      console.log('--- context ---');
      for (let k = Math.max(0, ln - 4); k < Math.min(bl.length, ln + 3); k++) {
        console.log(String(k + 1).padStart(5) + ' | ' + bl[k]);
      }
    }
  }
}