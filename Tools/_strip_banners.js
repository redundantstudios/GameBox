'use strict';
const fs = require('fs');

/* ---------- 1. Last Balloon: banner gone completely ----------
   The manifest lines are what make the shell build the container and reserve
   its layout space. Removing them is what actually makes the container
   disappear; changing game code alone would leave the empty strip behind. */
{
  const f = 'app/src/main/assets/games/last-balloon/index.html';
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace(/^banner: bottom\r?\n/m, '');
  s = s.replace(/^bannerBg: #\w+\r?\n/m, '');

  /* The polling shim is the only thing that ever asks for the strip. Gone
     along with the strip, so it cannot be brought back by a stray call. */
  const start = s.indexOf('/* Banner strip.');
  const end = s.indexOf('</script>', start);
  if (start >= 0 && end > start) {
    s = s.slice(0, start) +
      '/* No banner in this game. The strip and the space it reserved are both\n' +
      '   gone - see the note in AGENT.md - so nothing here brings one back. */\n' +
      s.slice(end);
  }
  fs.writeFileSync(f, s);
  console.log('last-balloon  banner lines gone:', !/^banner:/m.test(s) && !/bannerBg:/m.test(s),
              '| shim removed:', !/showBanner/.test(s));
}

/* ---------- 2. Balloon Battle: banner gone, game-over ad added ---------- */
{
  const f = 'app/src/main/assets/games/balloon-battle/index.html';
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace(/^banner: bottom\r?\n/m, '');
  s = s.replace(/^bannerBg: #\w+\r?\n/m, '');

  /* The moment the round ends. showInterstitialOnce() is the existing guard,
     so this cannot stack with the results-card buttons' own request - and if
     both do land, AdPolicy's 90s gap suppresses the second. */
  s = s.replace("if(stateT>1.6){state='RESULT';stateT=0;}",
    "if(stateT>1.6){state='RESULT';stateT=0;\n" +
    "       /* The round is over: this is the natural break, and until now the ad\n" +
    "          was only asked for from the results buttons, so losing showed\n" +
    "          nothing until the player tapped one of them. */\n" +
    "       showInterstitialOnce('gameover');}");

  fs.writeFileSync(f, s);
  console.log('balloon-battle banner lines gone:', !/^banner:/m.test(s) && !/bannerBg:/m.test(s),
              '| gameover ad:', /showInterstitialOnce\('gameover'\)/.test(s));
}