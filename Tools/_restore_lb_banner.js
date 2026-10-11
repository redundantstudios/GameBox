'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/last-balloon/index.html';
let s = fs.readFileSync(f, 'utf8');

/* Restore the strip, but ONLY on the game screen.
   The manifest lines are what make the shell build the container; the shim is
   what decides when it may show. Together they mean the strip appears on
   scr-game and nowhere else - not the menu, shop, how-to or the results card. */
if (!/^banner: bottom/m.test(s)) {
  s = s.replace(/^(bannerBg was|game:|title:)/m, m => m); // no-op guard
  const anchor = 'game:';
  if (s.includes(anchor)) {
    s = s.replace(anchor, 'banner: bottom\nbannerBg: #5cb85c\n' + anchor);
  }
}

if (!/b\.showBanner/.test(s)) {
  const marker = '/* No banner in this game.';
  const i = s.indexOf(marker);
  const end = s.indexOf('</script>', i);
  if (i >= 0 && end > i) {
    s = s.slice(0, i) +
      '/* Banner strip. This game has no Studio shim - it talks to the shell\'s bridge\n' +
      '   directly - so the request goes straight to NativeBridge. Shown ONLY while a\n' +
      '   run is live on the game screen, so it is torn down on every other screen and\n' +
      '   on pagehide: a strip left up over a menu or the arcade grid would follow the\n' +
      '   player out of the game page. */\n' +
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
      '  var iv=setInterval(function(){\n' +
      "    try{ want(currentScreen==='scr-game'); }catch(e){}\n" +
      '  },400);\n' +
      "  window.addEventListener('pagehide',function(){ clearInterval(iv); try{ want(false); }catch(e){} });\n" +
      '})();\n' +
      s.slice(end);
  }
}

fs.writeFileSync(f, s);
console.log('banner manifest restored:', /^banner: bottom/m.test(s));
console.log('bannerBg restored      :', /bannerBg: #5cb85c/.test(s));
console.log('shim restored (scr-game):', /currentScreen==='scr-game'/.test(s));
console.log('shows on game page only :', /want\(currentScreen==='scr-game'\)/.test(s));