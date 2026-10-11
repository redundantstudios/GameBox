'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/checkers/index.html';
let s = fs.readFileSync(f, 'utf8');

/* ---- 1. Pause sheet: NEW GAME and MAIN MENU had no ad ----
   RESUME deliberately has none - resuming a paused game is not a break, and
   charging an ad for it would be punishing the player for a tap they had to
   make to keep playing. */
const oldNew =
  '  pNew.addEventListener("click",function(){\n' +
  '    armConfirm(pNew,function(){ newGame(); closeModal(); });\n' +
  '  });';
const newNew =
  '  pNew.addEventListener("click",function(){\n' +
  '    /* Starting over and walking away from a live board both end the session the\n' +
  '       player was in. Neither asked for an ad before. */\n' +
  '    armConfirm(pNew,function(){ Studio.ads.interstitial(function(){ newGame(); closeModal(); }); });\n' +
  '  });';
const oldMenu =
  '  pMenu.addEventListener("click",function(){ AudioSys.play("tap"); closeModal(); persist(); showScreen("intro"); });';
const newMenu =
  '  pMenu.addEventListener("click",function(){ AudioSys.play("tap"); closeModal();\n' +
  '    Studio.ads.interstitial(function(){ persist(); showScreen("intro"); }); });';

const before = s;
s = s.replace(oldNew, newNew);
s = s.replace(oldMenu, newMenu);
fs.writeFileSync(f, s);

/* ---- 2. Does every way of ending a game reach the ad? ----
   showOverSheet() is the single place the end sheet is raised for chess, and it
   already asks for one. Resign goes through it too. Listing the callers proves
   there is no second ending that skips it. */
const callers = [];
s.split(/\r?\n/).forEach((l, i) => {
  if (/showOverSheet\(\)/.test(l) && !/function showOverSheet/.test(l)) callers.push((i + 1) + ': ' + l.trim().slice(0, 62));
});
console.log('showOverSheet() callers:');
callers.forEach(c => console.log('   ' + c));

const checks = {
  'game over asks for ad': /overSecondary\.textContent="MAIN MENU";\s*\n\s*try \{ Studio\.ads\.interstitial\(\); \}/.test(s),
  'resign routes through it': /result=\{type:"resign"/.test(s) && /if\(curScreen==="game"\) showOverSheet\(\);/.test(s),
  'pause NEW GAME ad': /armConfirm\(pNew,function\(\)\{ Studio\.ads\.interstitial/.test(s),
  'pause MAIN MENU ad': /pMenu[\s\S]{0,180}Studio\.ads\.interstitial/.test(s),
  'RESUME still ad-free': /pResume\.addEventListener\("click",function\(\)\{ AudioSys\.play\("tap"\); closeModal\(\); \}\);/.test(s),
  'over REMATCH ad kept': /Studio\.ads\.interstitial\(\); \}catch\(e\)\{\}\s*\n\s*newGame\(\);/.test(s),
  'over MAIN MENU ad kept': /Studio\.ads\.interstitial\(\); \}catch\(e\)\{\}\s*\n\s*persist\(\); showScreen\("intro"\);/.test(s),
  'changed': s !== before,
};
Object.entries(checks).forEach(([k, v]) => console.log((v ? 'OK   ' : 'MISS ') + k));