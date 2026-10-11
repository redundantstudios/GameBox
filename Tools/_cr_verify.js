'use strict';
const fs = require('fs');
const s = fs.readFileSync('app/src/main/assets/games/colour-rush/index.html', 'utf8');
const c = {
  'banner removed': !/^banner: bottom/m.test(s) && !/bannerBg:/m.test(s),
  'game over ad': /if\(!resultAdShown\)\{resultAdShown=true;/.test(s),
  'res-retry (PLAY AGAIN) ad': /#res-retry[\s\S]{0,120}Studio\.ads\.interstitial/.test(s),
  'res-menu (MAIN MENU) ad': /#res-menu[\s\S]{0,120}Studio\.ads\.interstitial/.test(s),
  'ov-restart ad': /#ov-restart[\s\S]{0,200}Studio\.ads\.interstitial/.test(s),
  'ov-menu ad': /#ov-menu[\s\S]{0,200}Studio\.ads\.interstitial/.test(s),
  'flag resets per match': /resultAdShown=false;pauseAdShown=false;/.test(s),
};
Object.entries(c).forEach(([k, v]) => console.log((v ? 'OK   ' : 'MISS ') + k));