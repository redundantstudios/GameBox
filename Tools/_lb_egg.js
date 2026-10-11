'use strict';
const fs = require('fs');

/* ===== 1. Last Balloon: actually insert the banner request =====
   The earlier attempt skipped insertion because its "is it already there?"
   test matched the sentence in a COMMENT that talks about removing a banner -
   not an actual call. The check below matches the call itself. */
{
  const f = 'app/src/main/assets/games/last-balloon/index.html';
  let s = fs.readFileSync(f, 'utf8');

  if (!/if\(b\.showBanner\)b\.showBanner\(\);/.test(s)) {
    const marker = '/* No banner in this game.';
    const i = s.indexOf(marker);
    const end = s.indexOf('</script>', i);
    if (i >= 0 && end > i) {
      s = s.slice(0, i) +
        "/* Banner strip. This game has no Studio shim - it talks to the shell's bridge\n" +
        '   directly - so the request goes straight to NativeBridge. Shown ONLY while a\n' +
        "   run is live on the game screen, and torn down on every other screen (menu,\n" +
        '   setup, shop, how-to, results) and on pagehide. The shell collapses the\n' +
        '   reserved container when it is hidden, so a screen that is not scr-game shows\n' +
        '   no strip and no empty bar. */\n' +
        '(function(){\n' +
        '  var on=false;\n' +
        '  function want(v){\n' +
        '    if(v===on)return;\n' +
        '    on=v;\n' +
        '    try{\n' +
        '      var b=window.NativeBridge;\n' +
        '      if(!b)return;\n' +
        '      if(v){ if(b.showBanner)b.showBanner(); }\n' +
        '      else{ if(b.hideBanner)b.hideBanner(); }\n' +
        '    }catch(e){}\n' +
        '  }\n' +
        "  var iv=setInterval(function(){\n" +
        "    try{ want(currentScreen==='scr-game'); }catch(e){}\n" +
        '  },400);\n' +
        "  window.addEventListener('pagehide',function(){ clearInterval(iv); try{ want(false); }catch(e){} });\n" +
        '})();\n' +
        s.slice(end);
      fs.writeFileSync(f, s);
    } else {
      console.log('  last-balloon: marker missing');
    }
  }
  const v = fs.readFileSync(f, 'utf8');
  console.log('last-balloon  call present:', /if\(b\.showBanner\)b\.showBanner\(\);/.test(v),
              '| game screen only:', /want\(currentScreen==='scr-game'\)/.test(v),
              '| manifest:', /^banner: bottom/m.test(v));
}

/* ===== 2. Egg Rush: banner gone, game-over ad added ===== */
{
  const f = 'app/src/main/assets/games/egg-rush/index.html';
  let s = fs.readFileSync(f, 'utf8');

  /* Dropping the manifest line is what removes the container and the reserved
     space - the game asking for a banner becomes a no-op on its own. */
  s = s.replace(/^banner: bottom\r?\n/m, '');
  s = s.replace(/^bannerBg: #\w+\r?\n/m, '');

  /* The ad helper is now dead weight; neutralised rather than deleted so the
     call sites stay readable. The game's own turn banner is showBanner(), which
     is a different thing entirely and is untouched. */
  s = s.replace(/  banner\(visible\)\{[\s\S]{0,400}?\n  \}/,
    '  /* No banner in this game - see the note above. */\n  banner(visible){}');

  /* Game over: the moment the result is reported. withAd() is the existing
     helper the end-of-run buttons already use, so this asks the same way. */
  s = s.replace(/(\s*)try\{ if\(window\.NativeBridge&&typeof window\.NativeBridge\.onGameOver==='function'\)/,
    "\n  /* The run is over - the natural break. Only the buttons that end a run asked\n" +
    "     for an ad before, so finishing showed nothing until one was tapped. */\n" +
    "  try{ if(!overAdDone){ overAdDone=true; withAd('gameover',function(){}); } }catch(_){}\n" +
    "$1try{ if(window.NativeBridge&&typeof window.NativeBridge.onGameOver==='function')");

  if (!/var overAdDone/.test(s)) s = s.replace('function withAd(placement,done){', 'let overAdDone=false;\nfunction withAd(placement,done){');

  fs.writeFileSync(f, s);

  const checks = {
    'manifest banner removed': !/^banner:/m.test(s) && !/bannerBg:/m.test(s),
    'ad helper neutralised': /banner\(visible\)\{\}/.test(s),
    'game over ad': /overAdDone=true; withAd\('gameover'/.test(s),
    'flag declared': /let overAdDone=false;/.test(s),
  };
  Object.entries(checks).forEach(([k, val]) => console.log('egg-rush     ', (val ? 'OK   ' : 'MISS ') + k));
}