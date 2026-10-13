'use strict';
const fs = require('fs');
const G = id => fs.readFileSync('app/src/main/assets/games/' + id + '/index.html', 'utf8');

let all = true;
const T = (g, label, re) => {
  const ok = re.test(G(g));
  if (!ok) all = false;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + g.padEnd(14) + label);
};
const K = (label, fn) => { const ok = fn(); if (!ok) all = false; console.log((ok ? 'PASS  ' : 'FAIL  ') + 'shell'.padEnd(14) + label); };

console.log('--- knot away ---');
T('knot-away', 'no visible code at top',  /^(?!<!DOCTYPE html>[\s\S]{0,90}New run: allow)/);
T('knot-away', 'real rewarded ad',      /__shellRewarded\("knotaway\./);
T('knot-away', 'level-complete ad',     /knotaway\.level\.complete/);
T('knot-away', 'replay ad',             /knotaway\.complete\.replay/);
T('knot-away', 'kit persists',          /kitGranted:false/);
T('knot-away', 'no per-level refill',   /if\(!G\.kitGranted\)\{G\.undoLeft=G\.levelData\.uses/);
T('knot-away', 'retry uses snapshot',   /G\.undoLeft=G\.undoSnap/);
T('knot-away', 'banner bg = page',      /bannerBg: #DFC79C/);
T('knot-away', 'banner hides on sheets',/__shellBlock\(true\)/);
T('knot-away', 'audio at boot',         /SFX_MAKEUP=1\.9, MUS_MAKEUP=2\.2/);

console.log('--- carroms ---');
T('carroms', '2h unlock',       /UNLOCK_HOURS=2/);
T('carroms', 'AD chip',         /class="adchip"/);
T('carroms', 'theme needs ad',  /carroms\.theme\./);
T('carroms', 'no amp bug',      /^(?![\s\S]*&amp;)/);
T('carroms', '4 players',       /maxPlayers: 4/);
T('carroms', 'back arrow hides',/&&!sheet/);
T('carroms', 'volume up',       /MUS_VOL=1\.15, SFX_VOL=1\.3/);

console.log('--- truth or dare ---');
T('truth-or-dare', 'no visible code',   /^(?!<!DOCTYPE html>[\s\S]{0,90}New run: allow)/);
T('truth-or-dare', 'real interstitial', /showInterstitial\(n,'truthordare\.break'\)/);
T('truth-or-dare', 'real rewarded',     /showRewardedAd\(n,placement\|\|'truthordare\.unlock','UNLOCK'\)/);
T('truth-or-dare', '1h mode unlock',    /TIER_MS=3600\*1000/);
T('truth-or-dare', 'pList scrolls',     /#pList\{max-height:min\(34vh/);
T('truth-or-dare', 'black banner',      /bannerBg: #000000/);
T('truth-or-dare', '10 players',        /maxPlayers: 10/);

console.log('--- mimic ---');
T('mimic', 'adSeq scoped',       /var settings=\{ sound:true, haptics:true \};\r?\n  \/\* Counter/);
T('mimic', 'score card clear of back', /rightEdge=gearX-gearR-gap/);
T('mimic', 'score card clamped', /W-safe\.r-bpW-12/);

console.log('--- shell ---');
K('truth-or-dare is a party game', () => /truth-or-dare/.test(fs.readFileSync('app/src/main/java/com/redundantstudios/arcade/ui/ModeActivity.kt', 'utf8')));
K('N-player grid capped at 5',     () => /MAX_N_PLAYER_TILE = 5/.test(fs.readFileSync('app/src/main/java/com/redundantstudios/arcade/MainActivity.kt', 'utf8')));

console.log('\n' + (all ? 'ALL CHECKS PASS' : 'SOME CHECKS FAILED'));