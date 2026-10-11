'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/colour-rush/index.html';
let s = fs.readFileSync(f, 'utf8');
const before = s;

/* ---- 1. no banner ---- */
s = s.replace(/^banner: bottom\r?\n/m, '');
s = s.replace(/^bannerBg: #\w+\r?\n/m, '');

/* ---- 2. one flag, so a single match never stacks two interstitials ---- */
const FLAG = 'var resultAdShown=false,pauseAdShown=false;';
if (!/var resultAdShown/.test(s)) {
  s = s.replace('function showResults(){', FLAG + '\nfunction showResults(){');
}
/* reset per match */
s = s.replace('function startMatch(){', 'function startMatch(){\n resultAdShown=false;pauseAdShown=false;');

/* ---- 3. game over ---- */
s = s.replace("function showResults(){\n state='idle';",
  "function showResults(){\n state='idle';\n" +
  " /* Raised here, where every finished match passes through exactly once.\n" +
  "    Previously this game only asked for an ad from its result buttons, so the\n" +
  "    moment the round actually ended showed nothing. */\n" +
  " if(!resultAdShown){resultAdShown=true;\n" +
  "  setTimeout(function(){if(Studio.ads&&Studio.ads.interstitial)Studio.ads.interstitial(function(){});},400);}");

/* ---- 4. result buttons: PLAY AGAIN + MAIN MENU ---- */
s = s.replace(
  "bindTap(qs('#res-menu'),function(){showScreen('scr-home');});",
  "bindTap(qs('#res-menu'),function(){Studio.ads.interstitial(function(){showScreen('scr-home');});});");

/* ---- 5. pause buttons: RESTART + MAIN MENU ---- */
const PAUSE_WIRING =
  "bindTap(qs('#ov-restart'),function(){if(pauseAdShown){startMatch();return;}\n" +
  "  pauseAdShown=true;Studio.ads.interstitial(function(){pauseAdShown=false;startMatch();});});\n" +
  "bindTap(qs('#ov-menu'),function(){if(pauseAdShown){showScreen('scr-home');return;}\n" +
  "  pauseAdShown=true;Studio.ads.interstitial(function(){pauseAdShown=false;showScreen('scr-home');});});";
if (!/bindTap\(qs\('#ov-restart'\)/.test(s)) {
  s = s.replace("bindTap(qs('#ov-resume'),function(){gameResume();});",
    "bindTap(qs('#ov-resume'),function(){gameResume();});\n" + PAUSE_WIRING);
}

fs.writeFileSync(f, s);

const checks = {
  'banner removed': !/^banner: bottom/m.test(s) && !/bannerBg:/m.test(s),
  'flag declared': /var resultAdShown=false,pauseAdShown=false;/.test(s),
  'reset per match': /resultAdShown=false;pauseAdShown=false;/.test(s),
  'game over ad': /if\(!resultAdShown\)\{resultAdShown=true;/.test(s),
  'res-menu ad': /#res-menu[\s\S]{0,80}Studio\.ads\.interstitial/.test(s),
  'res-retry ad (existing)': /#res-retry[\s\S]{0,90}Studio\.ads\.interstitial/.test(s),
  'pause restart ad': /#ov-restart[\s\S]{0,140}Studio\.ads\.interstitial/.test(s),
  'pause menu ad': /#ov-menu[\s\S]{0,140}Studio\.ads\.interstitial/.test(s),
};
Object.entries(checks).forEach(([k, v]) => console.log((v ? 'OK   ' : 'MISS ') + k));
console.log('changed:', s !== before);