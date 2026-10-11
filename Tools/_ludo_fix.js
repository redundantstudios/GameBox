'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/ludo/index.html';
let s = fs.readFileSync(f, 'utf8');
const before = s;

const swap = (from, to, label) => {
  if (!s.includes(from)) { console.log('MISS ' + label); return; }
  s = s.replace(from, to);
  console.log('OK   ' + label);
};

/* ---- 1. Ad when the game is actually won ----
   Every button in the switch already knew whether to ask; the match ENDING did
   not. The winner card came up silently and only produced an ad if the player
   then tapped to-menu or rematch. One-shot per game, cleared in newGame(). */
swap("  G.cur=0; G.winner=-1; G.legal=[]; G.phase='IDLE'; G.order=[];",
     "  G.cur=0; G.winner=-1; G.legal=[]; G.phase='IDLE'; G.order=[];\n" +
     "  gameOverAdDone=false;",
     'flag reset in newGame');

swap("  G.phase='IDLE';",
     "  G.phase='IDLE';\n" +
     "  gameOverAdDone=false;",
     'flag reset (phase init)');

swap('let G={ screen:', 'let gameOverAdDone=false;\nlet G={ screen:', 'flag declared');

/* ---- 2. Leaving a LIVE game asked for nothing ----
   to-menu only asked when the game was already over, so backing out of a game
   in progress - the pause sheet's way home - was free. */
swap(
  "  case 'to-menu':\n" +
  "  if(G.phase==='OVER'&&G.winner>=0) showInterstitial(goMenu); // interstitial after every game\n" +
  "  else goMenu();\n" +
  "  break;",
  "  case 'to-menu':\n" +
  "  /* Walking away from a board in progress is as much a break as leaving a\n" +
  "     finished one - the player is giving the session up either way. */\n" +
  "  showInterstitial(goMenu);\n" +
  "  break;",
  'to-menu always asks');

fs.writeFileSync(f, s);

/* ---- 3. The ad at the win itself, hooked to the winner card ---- */
if (!/gameOverAdDone=true;/.test(s)) {
  s = fs.readFileSync(f, 'utf8');
  const i = s.indexOf('function showVictory');
  if (i < 0) { console.log('MISS showVictory not found'); }
  else {
    const brace = s.indexOf('{', s.indexOf(')', i));
    const hook = "\n  /* The game is won - the natural break. Nothing asked for an ad here\n" +
      "     before: the winner card came up silently and only produced one if the\n" +
      "     player then tapped to-menu or rematch. One-shot per game. */\n" +
      "  if(!gameOverAdDone){ gameOverAdDone=true; setTimeout(function(){ showInterstitial(function(){}); },600); }";
    s = s.slice(0, brace + 1) + hook + s.slice(brace + 1);
    fs.writeFileSync(f, s);
    console.log('OK   game over ad in showVictory');
  }
}

const v = fs.readFileSync(f, 'utf8');
const checks = {
  'flag declared': /let gameOverAdDone=false;/.test(v),
  'flag reset in newGame': /G\.order=\[\];\s*\n\s*gameOverAdDone=false;/.test(v),
  'game over ad': /if\(!gameOverAdDone\)\{ gameOverAdDone=true;/.test(v),
  'to-menu ad': /case 'to-menu':[\s\S]{0,220}showInterstitial\(goMenu\);/.test(v),
  'rematch ad kept': /case 'rematch':[\s\S]{0,160}showInterstitial/.test(v),
  'resume still ad-free': /case 'resume': paused=false; lastT=0; break;/.test(v),
  'exit still ad-free': /case 'exit'[\s\S]{0,120}Studio\.exit/.test(v),
  'start still ad-free': /case 'start'[\s\S]{0,200}openUpsell|const begin=\(\)=>newGame/.test(v),
  'changed': v !== before,
};
Object.entries(checks).forEach(([k, val]) => console.log((val ? 'OK   ' : 'MISS ') + k));