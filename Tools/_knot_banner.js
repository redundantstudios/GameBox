'use strict';
const fs = require('fs');
const path = require('path');
const f = path.join('app/src/main/assets/games', 'knot-away', 'index.html');
let s = fs.readFileSync(f, 'utf8');

/* The manifest asked the shell to pad the strip with dark navy #1b2733. The game
   page is a warm cream ramp (#F6ECDA -> #EDDDBE -> #DFC79C), so the banner showed
   up as a dark slab across the bottom of a cream board. --bg-lo is the colour at
   the very bottom of that ramp, which is exactly what sits behind a bottom strip. */
if (/bannerBg: #1b2733/.test(s)) {
  s = s.replace('bannerBg: #1b2733', 'bannerBg: #DFC79C');
  console.log('OK   knot-away bannerBg #1b2733 -> #DFC79C (bottom of the page ramp)');
} else console.log('     knot-away bannerBg already set');

/* Sanity: the banner must be hidden whenever a sheet is up, not only off "game". */
const blocked = /__shellBlock/.test(s);
console.log('     panel-aware banner:', blocked);

fs.writeFileSync(f, s);
console.log('checks:', /bannerBg: #DFC79C/.test(s));