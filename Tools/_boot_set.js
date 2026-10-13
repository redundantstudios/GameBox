'use strict';
const fs = require('fs');
const path = require('path');

const BOOT = {
  'knot-away': "  try{ window.__shellScreen='home'; window.__shellScreenSync(); }catch(e){}",
  'carroms': "  try{ window.__shellScreen='home'; window.__shellScreenSync(); }catch(e){}",
  'truth-or-dare': "  try{ window.__shellScreen='title'; window.__shellScreenSync(); }catch(e){}",
};

for (const [id, line] of Object.entries(BOOT)) {
  const f = path.join('app/src/main/assets/games', id, 'index.html');
  let s = fs.readFileSync(f, 'utf8');
  if (s.includes('__SHELL_BOOT__')) { console.log('already ' + id); continue; }

  const re = /  window\.__shellAd=ad;\r?\n  window\.__shellRewarded=rewarded;\r?\n\}\)\(\);/;
  if (!re.test(s)) { console.log('MISS ' + id); continue; }

  s = s.replace(re,
    '$&\n' +
    '/* __SHELL_BOOT__ - set the start screen once the game has finished booting,\n' +
    '   so the banner and the back button are right from the first frame. */\n' +
    'setTimeout(function(){\n' + line + '\n},0);');

  fs.writeFileSync(f, s);
  console.log('OK   ' + id + ' boot hook');
}