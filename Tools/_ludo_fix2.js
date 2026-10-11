'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/ludo/index.html';
let s = fs.readFileSync(f, 'utf8');

/* 1. Declare the flag next to the game state object. It is `const G=`, not
      `let G=`, so the earlier anchor never matched - and without this the two
      uses of gameOverAdDone would have been an implicit global. */
if (!/let gameOverAdDone\s*=/.test(s)) {
  s = s.replace(/(const G=\{\s*screen:)/, 'let gameOverAdDone=false;\n$1');
  console.log('declared:', /let gameOverAdDone=false;/.test(s));
}

/* 2. Leaving a live board. Whitespace-tolerant this time. */
const pattern = /case\s+'to-menu':[\s\S]{0,160}?showInterstitial\(goMenu\);[\s\S]{0,120}?else goMenu\(\);/;
if (pattern.test(s)) {
  s = s.replace(pattern,
    "case 'to-menu':\n" +
    "  /* Walking away from a board in progress is as much a break as leaving a\n" +
    "     finished one - the player is giving the session up either way. */\n" +
    "  showInterstitial(goMenu);");
  console.log('to-menu rewritten:', /case\s+'to-menu':[\s\S]{0,220}showInterstitial\(goMenu\);/.test(s));
} else {
  console.log('to-menu: pattern did not match');
}

fs.writeFileSync(f, s);

const v = fs.readFileSync(f, 'utf8');
console.log('still has "else goMenu()" inside to-menu:', /case 'to-menu'[\s\S]{0,200}else goMenu/.test(v));