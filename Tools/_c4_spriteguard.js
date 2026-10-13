'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join('app', 'src', 'main', 'assets', 'games', 'connect-four', 'index.html');
let s = fs.readFileSync(FILE, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
let lines = s.split(NL);

/* The table sprite got a guard last time but boardSprite did not, and boardSprite
   is built by the same resize() call. resize() returns early (and retries in
   60ms) when the inline script runs before the WebView has laid out, so for the
   first few frames BOTH sprites are still null and loop() was handing null to
   drawImage:

     Uncaught TypeError: Failed to execute 'drawImage' ... The provided value is
     not of type '(CSSImageValue or HTMLCanvasElement or ...)'

   Guard the whole render, not just one sprite: do the simulation, skip the
   drawing until the board actually exists. */
let i = -1;
for (let k = 0; k < lines.length; k++) {
  if (lines[k].includes('if(tableSprite&&tableSprite.width>0&&tableSprite.height>0)')) { i = k; break; }
}
if (i < 0) { console.log('MISS tableSprite guard'); process.exit(1); }

lines.splice(i, 3,
  '  /* resize() can bail out (retrying in 60ms) when this script runs before the',
  '     WebView has laid out, which leaves the board sprites null for the first few',
  '     frames. Draw nothing until they exist - passing null to drawImage throws, and',
  '     it threw on EVERY frame until the retry landed. */',
  '  if(!tableSprite||!boardSprite)return;',
  '  g.drawImage(tableSprite,0,0,vw,vh);');

fs.writeFileSync(FILE, lines.join(NL));
console.log('OK   loop() skips drawing until the board sprites exist');
console.log('  verify:', /if\(!tableSprite\|\|!boardSprite\)return;/.test(fs.readFileSync(FILE, 'utf8')));