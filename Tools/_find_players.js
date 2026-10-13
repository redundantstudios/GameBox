'use strict';
const fs = require('fs');
const p = 'app/src/main/java/com/redundantstudios/arcade/';
const walk = d => fs.readdirSync(p + d, { withFileTypes: true })
  .flatMap(e => (e.isDirectory() ? walk(d + e.name + '/') : [d + e.name]));
walk('').filter(f => f.endsWith('.kt')).forEach(f => {
  fs.readFileSync(p + f, 'utf8').split(/\r?\n/).forEach((l, i) => {
    if (/putExtra\("(players|mode|skill)"|getIntExtra\("players"/.test(l)) {
      console.log(f + ':' + (i + 1) + ' | ' + l.trim().slice(0, 88));
    }
  });
});