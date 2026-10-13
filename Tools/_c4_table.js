'use strict';
const fs = require('fs');
const path = require('path');
const f = path.join('app/src/main/assets/games', 'connect-four', 'index.html');
let s = fs.readFileSync(f, 'utf8');
const swap = (from, to, label) => {
  const re = from instanceof RegExp ? from : new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  if (!re.test(s)) { console.log('MISS ' + label); return; }
  s = s.replace(re, to); console.log('OK   ' + label);
};

/* ---- THE FIRST FRAME THREW ----
   buildTable() sized its sprite with a bare `vw*dpr`, while buildBoard() guarded
   the same idea with Math.max(2,...). The inline script runs before the WebView
   has finished laying out, so on the very first resize() innerWidth was still 0,
   the table sprite came out 0x0, and loop() called drawImage on it:

     Uncaught InvalidStateError: Failed to execute 'drawImage' ... a canvas
     element with a width or height of 0

   It only fired once because the resize event landed a moment later and rebuilt
   everything, but that first frame painted no table at all and threw on the way
   out. Three fixes: do not build from a zero-size viewport, clamp the sprite
   the way buildBoard already does, and never hand drawImage a dead sprite. */

swap(
  /function resize\(\)\{\r?\n  dpr=Math\.min\(2\.5,window\.devicePixelRatio\|\|1\);\r?\n  vw=innerWidth;vh=innerHeight;/,
  'function resize(){\n' +
  '  dpr=Math.min(2.5,window.devicePixelRatio||1);\n' +
  '  vw=innerWidth;vh=innerHeight;\n' +
  '  /* The inline script runs before the WebView has laid out, so this can be\n' +
  '     called with a zero-size viewport. Building sprites from it produced a 0x0\n' +
  '     table that the first loop() then passed to drawImage, which threw. Wait\n' +
  '     for a real size - the resize event arrives a moment later anyway. */\n' +
  '  if(!(vw>0&&vh>0)){ setTimeout(resize,60); return; }',
  'resize skips a zero-size viewport');

swap(
  /  tableSprite=document\.createElement\('canvas'\);\r?\n  tableSprite\.width=vw\*dpr;tableSprite\.height=vh\*dpr;/,
  "  tableSprite=document.createElement('canvas');\n" +
  '  /* Clamped the way buildBoard already clamps - a canvas is never 0x0. */\n' +
  '  tableSprite.width=Math.max(2,Math.round(vw*dpr));\n' +
  '  tableSprite.height=Math.max(2,Math.round(vh*dpr));',
  'table sprite clamped');

swap(
  /  g\.drawImage\(tableSprite,0,0,vw,vh\);/,
  '  /* Belt and braces: skip a sprite that is somehow still unusable rather than\n' +
  "     throwing out of the render loop. requestAnimationFrame is already queued\n" +
  '     at the top of loop(), so a throw here would not stop the next frame - it\n' +
  '     would just repeat it every frame. */\n' +
  '  if(tableSprite&&tableSprite.width>0&&tableSprite.height>0) g.drawImage(tableSprite,0,0,vw,vh);',
  'loop guards the table sprite');

fs.writeFileSync(f, s);
console.log('\nchecks:');
console.log('  resize guard :', /if\(!\(vw>0&&vh>0\)\)\{ setTimeout\(resize,60\); return; \}/.test(s));
console.log('  clamped      :', /tableSprite\.width=Math\.max\(2,Math\.round\(vw\*dpr\)\)/.test(s));
console.log('  loop guard   :', /if\(tableSprite&&tableSprite\.width>0/.test(s));