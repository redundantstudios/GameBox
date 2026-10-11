'use strict';
const fs = require('fs');

/* ===== Egg Rush: the one-shot flag was never cleared =====
   showResult() runs once per round, but overAdDone was set on the FIRST round
   and never reset - so every round after that asked for nothing. The device log
   showed the only request ever made was gameover.menu, the results MENU button,
   which never touches this flag. */
{
  const f = 'app/src/main/assets/games/egg-rush/index.html';
  let s = fs.readFileSync(f, 'utf8');

  const spots = [];
  s.split(/\r?\n/).forEach((l, i) => {
    if (/state='COUNTDOWN'/.test(l)) spots.push(i + 1);
  });
  console.log('egg-rush countdown lines:', spots.join(', ') || 'none found');

  /* Reset at the countdown, which is the start of every round - PLAY, REMATCH
     and RESTART all go through it, so no other entry point can be missed. */
  s = s.replace(/(\n\s*)([^\n]*state='COUNTDOWN'[^\n]*)/,
    "\n$1/* New round: allow one game-over interstitial again. Without this the flag\n$1   stayed set after the first round and every later finish asked for none. */\n$1overAdDone=false;\n$1$2");

  fs.writeFileSync(f, s);
  console.log('  reset inserted:', /overAdDone=false;\s*\n\s*[^\n]*state='COUNTDOWN'/.test(s));
}

/* ===== Memory Grab: banner background + game-over interstitial ===== */
{
  const f = 'app/src/main/assets/games/memory-grab/index.html';
  let s = fs.readFileSync(f, 'utf8');

  /* The page it sits on is #FFE3C4; the strip was painted near-black. */
  s = s.replace(/^bannerBg: #\w+\r?\n/m, 'bannerBg: #FFE3C4\n');

  /* Game over. The results screen's RESTART / MENU / PLAY AGAIN buttons already
     ask for one - this is the moment the round ends, which asked for nothing.
     One-shot per round, reset in startRound(). */
  s = s.replace('function showResults(){',
    'let overAdDone=false;\nfunction showResults(){\n' +
    "  /* The round is over - the natural break. Only the buttons on this screen asked\n" +
    '     for an ad before, so finishing showed nothing until one was tapped. */\n' +
    "  if(!overAdDone){ overAdDone=true; try{ Studio.ads.interstitial(function(){},'gameover'); }catch(_){} }");

  if (!/function startRound\s*\(/.test(s)) {
    /* fall back: reset alongside the flag's declaration owner if named otherwise */
    s = s.replace('let overAdDone=false;', 'let overAdDone=false;\nfunction __overAdReset(){ overAdDone=false; }');
  } else {
    s = s.replace(/(function startRound\s*\([^)]*\)\s*\{)/, '$1\n  overAdDone=false;');
  }

  fs.writeFileSync(f, s);
  const checks = {
    'bannerBg = page colour': /bannerBg: #FFE3C4/.test(s),
    'game over ad': /if\(!overAdDone\)\{ overAdDone=true;/.test(s),
    'flag reset on new round': /function startRound\s*\([^)]*\)\s*\{\s*\n\s*overAdDone=false;/.test(s),
    'button ads intact': /gameover/.test(s) && /btn-again/.test(s),
  };
  Object.entries(checks).forEach(([k, v]) => console.log('memory-grab ', (v ? 'OK   ' : 'MISS ') + k));
}