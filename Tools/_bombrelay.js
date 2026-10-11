'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/bomb-relay/index.html';
let s = fs.readFileSync(f, 'utf8');

/* ---- 1. banner background = the game page colour ----
   --bg is #F8ECD4 (cream); the strip was painted #221c2b (near-black), which
   matched nothing on the page it sits on. */
s = s.replace(/^bannerBg: #\w+\r?\n/m, 'bannerBg: #F8ECD4\n');

/* ---- 2. interstitial when the round is actually lost ----
   This game already asked for an ad from the game-over screen's REMATCH and
   MENU buttons, but the moment the round ended asked for nothing. */
s = s.replace('  show(\'scr-over\');',
  "  show('scr-over');\n" +
  "  /* The round is over - this is the natural break. Only the buttons on this\n" +
  "     screen asked for an ad before, so losing showed nothing until the player\n" +
  "     tapped one. One-shot, reset per round in startMatch(). */\n" +
  "  if(!overAdDone){\n" +
  "    overAdDone=true;\n" +
  "    setTimeout(function(){try{Studio.ads.interstitial(function(){},'gameover');}catch(_){}} ,400);\n" +
  "  }");

/* ---- 3. interstitial on the pause popup's QUIT -> YES ---- */
s = s.replace("$('btnQuitYes').addEventListener('click',quitToMenu);",
  "/* Only this button is wrapped. quitToMenu is also reached from the game-over\n" +
  "   screen, which asks for its own ad - wrapping the shared function would\n" +
  "   have asked for two. */\n" +
  "$('btnQuitYes').addEventListener('click',function(){\n" +
  "  try{Studio.ads.interstitial(function(){quitToMenu();},'pause.quit');}catch(_){quitToMenu();}\n" +
  "});");

/* ---- 4. the one-shot flag, declared and reset per round ---- */
if (!/var overAdDone/.test(s)) {
  s = s.replace('function showGameOver(){', 'var overAdDone=false;\nfunction showGameOver(){');
}
s = s.replace('function startMatch(', 'function startMatch(setup){\n  overAdDone=false;');
s = s.replace('function startMatch(setup){\n  overAdDone=false;\n', 'function startMatch(setup){\n  overAdDone=false;');

fs.writeFileSync(f, s);

const c = {
  'bannerBg = game page cream': /bannerBg: #F8ECD4/.test(s),
  'game over ad': /overAdDone=true;/.test(s) && /'gameover'\);?catch/.test(s),
  'flag declared': /var overAdDone=false;/.test(s),
  'flag reset per round': /function startMatch\(setup\)\{\s*\n\s*overAdDone=false;/.test(s),
  'pause quit ad': /btnQuitYes[\s\S]{0,180}Studio\.ads\.interstitial/.test(s),
  'quitToMenu not double-wrapped': !/function quitToMenu\(\)\{[\s\S]{0,60}Studio\.ads\.interstitial/.test(s),
};
Object.entries(c).forEach(([k, v]) => console.log((v ? 'OK   ' : 'MISS ') + k));