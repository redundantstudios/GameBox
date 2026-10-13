'use strict';
const fs = require('fs');
const path = require('path');
for (const id of ['knot-away', 'carroms', 'truth-or-dare']) {
  const f = path.join('app/src/main/assets/games', id, 'index.html');
  const s = fs.readFileSync(f, 'utf8');
  console.log('===== ' + id + ' =====');
  for (const needle of ['New run: allow', '__SHELL_BOOT__', 'SHELL INTEGRATION']) {
    let i = s.indexOf(needle);
    while (i >= 0) {
      // which block is this in?
      const before = s.slice(0, i);
      const lastScript = before.lastIndexOf('<script>');
      const lastClose = before.lastIndexOf('</script>');
      const inScript = lastScript > lastClose;
      console.log('  "' + needle + '" @' + i + ' inScript=' + inScript);
      i = s.indexOf(needle, i + 1);
    }
  }
}