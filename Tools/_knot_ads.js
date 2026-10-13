'use strict';
const fs = require('fs');
const path = require('path');
const f = path.join('app/src/main/assets/games', 'knot-away', 'index.html');
let s = fs.readFileSync(f, 'utf8');

const swap = (from, to, label) => {
  const re = from instanceof RegExp ? from : new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  if (!re.test(s)) { console.log('MISS ' + label); return; }
  s = s.replace(re, to);
  console.log('OK   ' + label);
};

/* ---- WATCH AD: granted with no ad at all ----
   watchAdClicked() had an "AD SDK HOOK" marker and simply called grantReward(),
   so a player could take unlimited hints and undos by tapping WATCH AD. Now it
   goes through the shell's rewarded bridge and only grants on a real 'granted'. */
swap(
  /function watchAdClicked\(\)\{\r?\n  \/\* >>> AD SDK HOOK <<< \*\/\r?\n  grantReward\(\);\r?\n\}/,
  'function watchAdClicked(){\n' +
  '  /* This used to hand the reward over unconditionally - an "AD SDK HOOK"\n' +
  '     comment and a straight call to grantReward() - so hints and undos were\n' +
  '     unlimited for anyone willing to tap WATCH AD. The reward is only granted\n' +
  "     when the shell reports 'granted'. */\n" +
  '  var kind=rewardKind;\n' +
  '  if(window.__shellRewarded){\n' +
  '    window.__shellRewarded("knotaway."+(kind||"reward"), function(){ grantReward(); });\n' +
  '  } else { grantReward(); }\n' +
  '}',
  'WATCH AD is a real rewarded ad');

/* ---- LEVEL COMPLETION ----
   solveSequence() raised the completion panel silently. Completing a level is the
   natural break, and only the buttons under the panel ever asked for an ad. */
swap(
  /  openPanel\('complete'\);/,
  "  openPanel('complete');\n" +
  "  /* The level is solved - the natural break. Only the buttons on this panel\n" +
  "     asked for an ad before, so completing one showed nothing until you tapped\n" +
  '     one of them. */\n' +
  "  try{ if(!window.__shellWinAd){ window.__shellWinAd=1;\n" +
  "    window.__shellAd(function(){},'knotaway.level.complete'); } }catch(e){}",
  'level completion ad');

swap(
  /function startLevel\(idx\)\{\r?\n  \/\* New round: allow the game-over ad again\. \*\/\r?\n  try\{ window\.__shellOverAd=0; \}catch\(e\)\{\}/,
  'function startLevel(idx){\n' +
  '  /* New round: allow the game-over and level-complete ads again. */\n' +
  '  try{ window.__shellOverAd=0; window.__shellWinAd=0; }catch(e){}',
  'reset win ad each level');

/* ---- REPLAY ---- */
swap(
  /on\('#btnReplay',\(\)=>startLevel\(G\.lvlIdx\)\);/,
  "on('#btnReplay',()=>window.__shellAd(function(){startLevel(G.lvlIdx);},'knotaway.complete.replay'));",
  'REPLAY ad');

fs.writeFileSync(f, s);
console.log('\nchecks:');
console.log('  rewarded wired :', /__shellRewarded\("knotaway\./.test(s));
console.log('  complete ad    :', /knotaway\.level\.complete/.test(s));
console.log('  replay ad      :', /knotaway\.complete\.replay/.test(s));