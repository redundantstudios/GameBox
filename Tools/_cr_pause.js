'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/colour-rush/index.html';
let s = fs.readFileSync(f, 'utf8');

const PAUSE_WIRING = [
  "bindTap(qs('#ov-restart'),function(){if(pauseAdShown){startMatch();return;}",
  "  pauseAdShown=true;Studio.ads.interstitial(function(){pauseAdShown=false;startMatch();});});",
  "bindTap(qs('#ov-menu'),function(){if(pauseAdShown){showScreen('scr-home');return;}",
  "  pauseAdShown=true;Studio.ads.interstitial(function(){pauseAdShown=false;showScreen('scr-home');});});",
].join('\n');

const anchor = "bindTap(qs('#ov-resume'),function(){gameResume();});";
if (!s.includes(anchor)) {
  console.log('ANCHOR MISSING');
} else if (/bindTap\(qs\('#ov-restart'\)/.test(s)) {
  console.log('already present');
} else {
  s = s.replace(anchor, anchor + '\n' + PAUSE_WIRING);
  fs.writeFileSync(f, s);
  console.log('pause wiring inserted');
}

const checks = {
  'pause restart ad': /#ov-restart[\s\S]{0,160}Studio\.ads\.interstitial/.test(s),
  'pause menu ad': /#ov-menu[\s\S]{0,160}Studio\.ads\.interstitial/.test(s),
};
Object.entries(checks).forEach(([k, v]) => console.log((v ? 'OK   ' : 'MISS ') + k));