'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/chicken-chaos/index.html';
let s = fs.readFileSync(f, 'utf8');
const before = s;

/* ---- 1. THE GAME DID NOT RUN AT ALL ----
   The banner poll I added in d959e3e read a bare `state`. Chicken Chaos keeps
   its state on `game.state`, so the timer threw ReferenceError: state is not
   defined every 400ms, and the shell turns an uncaught page error into the
   game-error screen. Fixed here rather than just deleting, so the mistake is
   on the record - and the whole block goes below anyway. */
const oldPoll =
  "/* Banner: up while a round is being played, gone for the menus, the pause\n" +
  "   screen and the results. COUNTDOWN is included so the strip is up and filled\n" +
  "   before the round actually starts. */\n" +
  "var bannerOn=false;\n" +
  "setInterval(function(){\n" +
  "  var want=(state==='PLAYING'||state==='COUNTDOWN');\n" +
  "  if(want!==bannerOn){ bannerOn=want; try{ Studio.ads.banner(want); }catch(e){} }\n" +
  "},400);\n";

if (s.includes(oldPoll)) {
  s = s.replace(oldPoll,
    "/* No banner in this game. The poll that used to live here ran every 400ms and\n" +
    "   read a bare `state` instead of `game.state`, so it threw ReferenceError:\n" +
    "   state is not defined four times a second and the shell showed the\n" +
    "   game-error screen instead of the game. Removed, not repaired. */\n");
  console.log('OK   banner poll removed (the crash)');
} else {
  console.log('MISS banner poll');
}

/* ---- 2. Banner manifest + helper ---- */
s = s.replace(/^banner: bottom\r?\n/m, '');
s = s.replace(/^bannerBg: #\w+\r?\n/m, '');
console.log('OK   manifest banner lines removed');

s = s.replace(/  banner\(visible\)\{[\s\S]{0,300}?\n  \}/,
  '  /* No banner in this game - see the note at the foot of the file. */\n  banner(visible){}');
console.log('OK   bridge helper neutralised');

fs.writeFileSync(f, s);

const checks = {
  'no bare `state` left': !/(^|[^\w.$"'])state\s*(===|==)/.test(s),
  'manifest clean': !/^banner:/m.test(s) && !/bannerBg:/m.test(s),
  'no banner poll': !/bannerOn/.test(s),
  'helper neutralised': /banner\(visible\)\{\}/.test(s),
  'game over ad intact': /adBreak\(go,'chicken-chaos\.matchEnd'\)/.test(s),
  'result btns intact': /chicken-chaos\.result\.menu/.test(s),
  'pause btns intact': /chicken-chaos\.matchEnd/.test(s),
  'changed': s !== before,
};
Object.entries(checks).forEach(([k, v]) => console.log((v ? 'OK   ' : 'MISS ') + k));