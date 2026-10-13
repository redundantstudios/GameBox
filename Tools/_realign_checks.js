'use strict';
const fs = require('fs');

/* The three verifiers were written against earlier passes and went stale:
     - the tile is tile_connect_four.JPG now (512px pipeline in drawable-nodpi),
       not a .png, so the old existence check could never match;
     - the back-button poll was replaced by a permanent class poll in pass 2;
     - the launch sound values were deliberately lowered AGAIN in pass 3, so the
       pass-1 numbers no longer appear.
   A regression net that cries wolf is worse than none - realign them. */

let s = fs.readFileSync('Tools/_verify_c4.js', 'utf8');
s = s.replace(
  "const tiles = ['app/src/main/res/drawable-nodpi/tile_connect_four.png',\n               'app/src/main/res/drawable/tile_connect_four.png'];",
  "const tiles = fs.readdirSync('app/src/main/res/drawable-nodpi')\n" +
  "  .map(f => 'app/src/main/res/drawable-nodpi/' + f)\n" +
  "  .filter(f => /^tile_connect_four\\./.test(f.split('/').pop()))\n" +
  "  .concat(fs.readdirSync('app/src/main/res/drawable')\n" +
  "    .map(f => 'app/src/main/res/drawable/' + f)\n" +
  "    .filter(f => /^tile_connect_four\\./.test(f.split('/').pop())));"
);
fs.writeFileSync('Tools/_verify_c4.js', s);
console.log('OK   _verify_c4 tile check realigned');

let t = fs.readFileSync('Tools/_verify_c4_issues.js', 'utf8');
t = t.replace(
  "T('polls until it exists',   /_woodTimer=setInterval/);",
  "T('polls for the button',    /setInterval\\(function\\(\\)\\{\\s*\\n {2}var b=window\\.__shellBackBtn;/);"
);
t = t.replace(
  "T('quieter sweep',      /noise\\(\\{fc:820,fe:2100,dur:\\.06,vol:\\.05/);",
  "T('quieter sweep',      /noise\\(\\{fc:760,fe:1900,dur:\\.055,vol:\\.032/);"
);
t = t.replace(
  "T('body tone added',    /tone\\(\\{f:240,f2:150,dur:\\.055,vol:\\.045/);",
  "T('body tone added',    /tone\\(\\{f:210,f2:135,dur:\\.05,vol:\\.028/);"
);
fs.writeFileSync('Tools/_verify_c4_issues.js', t);
console.log('OK   _verify_c4_issues realigned');
