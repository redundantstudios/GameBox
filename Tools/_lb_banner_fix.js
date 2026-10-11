'use strict';
const fs = require('fs');

/* ---- Last Balloon: put the strip request back, game screen only ---- */
{
  const f = 'app/src/main/assets/games/last-balloon/index.html';
  let s = fs.readFileSync(f, 'utf8');

  if (!/b\.showBanner/.test(s)) {
    const marker = '/* No banner in this game.';
    const i = s.indexOf(marker);
    const end = s.indexOf('</script>', i);
    if (i < 0 || end < 0) {
      console.log('last-balloon: marker not found, cannot restore');
    } else {
      s = s.slice(0, i) +
        '/* Banner strip. This game has no Studio shim - it talks to the shell\'s bridge\n' +
        '   directly - so the request goes straight to NativeBridge. Shown ONLY while a\n' +
        '   run is live on the game screen, so it is torn down on every other screen\n' +
        '   (menu, setup, shop, how-to, results) and on pagehide. The shell collapses the\n' +
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
        "      if(v){ if(b.showBanner)b.showBanner(); }\n" +
        "      else{ if(b.hideBanner)b.hideBanner(); }\n" +
        '    }catch(e){}\n' +
        '  }\n' +
        "  /* Polled rather than driven from showScreen(), so the strip cannot be\n" +
        "     missed when a screen changes while an ad is in flight. */\n" +
        '  var iv=setInterval(function(){\n' +
        "    try{ want(currentScreen==='scr-game'); }catch(e){}\n" +
        '  },400);\n' +
        "  window.addEventListener('pagehide',function(){ clearInterval(iv); try{ want(false); }catch(e){} });\n" +
        '})();\n' +
        s.slice(end);
      fs.writeFileSync(f, s);
    }
  }
  const v = fs.readFileSync(f, 'utf8');
  console.log('last-balloon  manifest banner:', /^banner: bottom/m.test(v),
              '| bg:', (v.match(/bannerBg: #\w+/) || ['MISS'])[0],
              '| shim:', /b\.showBanner/.test(v),
              '| game-screen only:', /want\(currentScreen==='scr-game'\)/.test(v));
}