'use strict';
const fs = require('fs');
const F = 'app/src/main/assets/games/chess/index.html';
let s = fs.readFileSync(F, 'utf8');

/* The simulated panel is gone from the markup. The two fallback calls below
   only ever ran in a browser preview with no NativeBridge; in the shell the
   real ad fires above and returns first. Now they just continue, so a
   browser-only run plays on without inventing a fake ad dialog. */
function swap(label, from, to) {
  if (!s.includes(from)) { console.log('MISS ' + label); return false; }
  s = s.replace(from, to);
  console.log('OK   ' + label);
  return true;
}

swap('interstitial fallback',
  '  showTestAd("interstitial",CFG.ads.admobInterstitial,3,"Game over — thanks for playing!",next);',
  '  /* No shell bridge (browser preview): carry on without simulating an ad. */\n  if(typeof next==="function")try{ next(); }catch(e){}');

swap('rewarded fallback',
  '  showTestAd("rewarded",CFG.ads.admobRewarded,5,"Reward: +1 Streak Shield",onGrant);',
  '  /* No shell bridge (browser preview): no reward, no fake dialog. */\n  if(typeof onGrant==="function")try{ onGrant(); }catch(e){}');

fs.writeFileSync(F, s);

const left = (s.match(/showTestAd\(/g) || []).length;
console.log('\nremaining showTestAd references: ' + left);
const body = s.match(/function showTestAd\([\s\S]*?\n\}/);
if (body) {
  s = s.replace(body[0],
    '/* The simulated TEST AD panel was removed. It was development scaffolding:\n' +
    '   the real ad fires through Studio.ads whenever the shell bridge is present,\n' +
    '   and the only thing this fallback ever showed was a dialog reading\n' +
    '   "TEST INTERSTITIAL - SIMULATED" - which had no business in a shipped game. */');
  fs.writeFileSync(F, s);
  console.log('OK   showTestAd body replaced with an explanation');
}
console.log('  showTestAd gone      :', !/showTestAd\(/.test(s));
console.log('  testAdEl refs gone   :', !/testAdEl/.test(s));