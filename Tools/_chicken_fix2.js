'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/chicken-chaos/index.html';
let s = fs.readFileSync(f, 'utf8');

const swap = (from, to, label) => {
  if (!s.includes(from)) { console.log('MISS ' + label); return; }
  s = s.replace(from, to);
  console.log('OK   ' + label);
};

/* The crash. Read the raw indentation off the file rather than guessing. */
swap(
  "/* Banner: up while a round is being played, gone for the menus, the pause\n" +
  "     screen and the results. COUNTDOWN is included so the strip is up and filled\n" +
  "     before the round actually starts. */\n" +
  "  var bannerOn=false;\n" +
  "  setInterval(function(){\n" +
  "    var want=(state==='PLAYING'||state==='COUNTDOWN');\n" +
  "    if(want!==bannerOn){ bannerOn=want; try{ Studio.ads.banner(want); }catch(e){} }\n" +
  "  },400);\n",
  "/* No banner in this game. The poll that used to live here ran every 400ms and\n" +
  "     read a bare `state` instead of `game.state`, so it threw ReferenceError:\n" +
  "     state is not defined four times a second, and the shell turned that into\n" +
  "     the game-error screen - the game never appeared at all. Removed rather\n" +
  "     than repaired. */\n",
  'banner poll removed (the crash)');

swap(
  "      banner(visible){\n" +
  "        const b=bridge();\n" +
  "        if(!b)return;\n" +
  "        try{ if(visible){ if(b.showBanner)b.showBanner(); } else { if(b.hideBanner)b.hideBanner(); } }catch(e){}\n" +
  "      },\n",
  "      /* No banner in this game - see the note at the foot of the file. */\n" +
  "      banner(visible){},\n",
  'bridge helper neutralised');

fs.writeFileSync(f, s);

const v = fs.readFileSync(f, 'utf8');
const checks = {
  'no bare `state` reads': !/(^|[^\w.$"'])state\s*(===|==|!==)/.test(v),
  'no banner poll': !/bannerOn/.test(v),
  'helper neutralised': /banner\(visible\)\{\},/.test(v),
  'manifest clean': !/^banner:/m.test(v) && !/bannerBg:/m.test(v),
  'game over ad intact': /adBreak\(go,'chicken-chaos\.matchEnd'\)/.test(v),
  'result PLAY AGAIN ad': /chicken-chaos\.result\./.test(v),
  'pause RESTART ad': /uiBtn\('restart'[\s\S]{0,160}adBreak/.test(v),
  'pause MENU ad': /uiBtn\('menu'[\s\S]{0,160}adBreak/.test(v),
};
Object.entries(checks).forEach(([k, val]) => console.log((val ? 'OK   ' : 'MISS ') + k));