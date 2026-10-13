'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/mimic/index.html';
let s = fs.readFileSync(f, 'utf8');
const lines = s.split(/\r?\n/);

// BLOCK 2 owns the private `settings`; everything after it is a different scope.
const blockStart = lines.findIndex(l => /STUDIO_GAME_MANIFEST/.test(l));
const lines2End = lines.findIndex(l => /^<\/script>$/.test(l) && l === '</script>');

lines.forEach((l, i) => {
  if (i <= lines2End) return;
  if (/(^|[^\w.$'"])settings\s*[.=,)]/.test(l)) {
    console.log(String(i + 1).padStart(5) + ' | ' + l.trim().slice(0, 100));
  }
});