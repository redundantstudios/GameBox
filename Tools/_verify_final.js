'use strict';
const fs = require('fs');

const read = g => fs.readFileSync(`app/src/main/assets/games/${g}/index.html`, 'utf8');

const lb = read('last-balloon');
const lbChecks = {
  'banner removed (no manifest lines)': !/^banner:/m.test(lb) && !/bannerBg:/m.test(lb),
  'banner shim gone (no showBanner call)': !/b\.showBanner/.test(lb),
  'game over ad': /if\(!gameOverAdDone\)\{[\s\S]{0,140}lastballoon\.gameover/.test(lb),
  'flag declared': /var gameOverAdDone=false;/.test(lb),
  'flag reset per round': /function startGame\(players\)\{\s*\n\s*gameOverAdDone=false;/.test(lb),
  'LEAVE btn ad': /lastballoon\.quit\.leave/.test(lb),
  'LEAVE wraps, does not double-fire': /quitToMenu\s*\n?\s*\}\s*\n?\s*\);/.test(lb) || /function\(\)\{withInterstitial\('lastballoon\.quit\.leave',quitToMenu\);\}/.test(lb),
  'REMATCH ad kept': /lastballoon\.gameover\.rematch/.test(lb),
  'HOME btn ad kept': /lastballoon\.gameover\.menu/.test(lb),
};
console.log('--- last-balloon ---');
Object.entries(lbChecks).forEach(([k, v]) => console.log((v ? 'OK   ' : 'MISS ') + k));

const bb = read('balloon-battle');
const bbChecks = {
  'banner removed (no manifest lines)': !/^banner:/m.test(bb) && !/bannerBg:/m.test(bb),
  'game over ad on ENDING->RESULT': /showInterstitialOnce\('gameover'\)/.test(bb),
  'pause RESTART ad kept': /playWithAd\(nPlayers,soloMode,'pause/.test(bb),
  'pause MENU ad kept': /backToMenu\('pause/.test(bb),
  'results PLAY AGAIN ad kept': /playWithAd\(nPlayers,soloMode,'gameover/.test(bb),
  'results MENU ad kept': /backToMenu\(/.test(bb),
};
console.log('--- balloon-battle ---');
Object.entries(bbChecks).forEach(([k, v]) => console.log((v ? 'OK   ' : 'MISS ') + k));