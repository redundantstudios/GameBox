'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/chinese-checkers/index.html';
let s = fs.readFileSync(f, 'utf8');

const swap = (from, to, label) => {
  if (!s.includes(from)) { console.log('MISS ' + label); return; }
  s = s.split(from).join(to); console.log('OK   ' + label);
};

/* Same scope trap as syncBanner, caught the same way. `overAdDone` lived inside
   the shell IIFE; finishGame() and initializeGame() are the game's own code,
   outside it, so every call threw ReferenceError: overAdDone is not defined.
   Exported so both can reach it. */
swap('  var overAdDone=false;',
     '  window.__ccOverAdDone=false;\n  var overAdDone=false;',
     'flag exported');

swap("if(!overAdDone){ overAdDone=true; interstitial(function(){},'chinesecheckers.gameover'); }",
     "if(!window.__ccOverAdDone){ window.__ccOverAdDone=true; interstitial(function(){},'chinesecheckers.gameover'); }",
     'game over reads exported flag');

swap('function initializeGame(c,restore){\r\n  overAdDone=false;',
     'function initializeGame(c,restore){\r\n  window.__ccOverAdDone=false;',
     'reset writes exported flag');

fs.writeFileSync(f, s);
console.log('bare overAdDone outside the IIFE:',
  (s.match(/[^\w.]overAdDone/g) || []).length);