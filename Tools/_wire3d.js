'use strict';
const fs = require('fs');
const path = require('path');

const JOBS = [
  ['knot-away', [
    ["on('#btnRestart',()=>restartLevel());",
     "on('#btnRestart',()=>{window.__shellAd(function(){restartLevel();},'knotaway.pause.restart');});",
     'pause RESTART'],
    ["on('#btnPauseHome',()=>{closePanels();showScreen('home')});",
     "on('#btnPauseHome',()=>{closePanels();window.__shellAd(function(){showScreen('home');},'knotaway.pause.home');});",
     'pause HOME'],
    ["on('#btnTryRestart',()=>startLevel(G.lvlIdx));",
     "on('#btnTryRestart',()=>{window.__shellAd(function(){startLevel(G.lvlIdx);},'knotaway.over.restart');});",
     'try-again RESTART'],
    ["on('#btnTryHome',()=>{closePanels();showScreen('home')});",
     "on('#btnTryHome',()=>{closePanels();window.__shellAd(function(){showScreen('home');},'knotaway.over.home');});",
     'try-again HOME'],
    ["on('#btnHomeC',()=>{closePanels();showScreen('home')});",
     "on('#btnHomeC',()=>{closePanels();window.__shellAd(function(){showScreen('home');},'knotaway.complete.home');});",
     'complete HOME'],
  ]],
  ['carroms', [
    ["$('#bRestart').onclick=()=>startGame(Game.cfg);",
     "$('#bRestart').onclick=()=>window.__shellAd(function(){startGame(Game.cfg);},'carroms.board.restart');",
     'board RESTART'],
    ["$('#bAgain').onclick=()=>startGame(Game.cfg);",
     "$('#bAgain').onclick=()=>window.__shellAd(function(){startGame(Game.cfg);},'carroms.board.again');",
     'board AGAIN'],
    ["$('#bHome2').onclick=()=>showHome();",
     "$('#bHome2').onclick=()=>window.__shellAd(function(){showHome();},'carroms.board.home');",
     'board HOME'],
    ["$('#bPauseHome').onclick=()=>{ closePause(); showHome(); };",
     "$('#bPauseHome').onclick=()=>{ closePause(); window.__shellAd(function(){showHome();},'carroms.pause.home'); };",
     'pause HOME'],
    ["$('#bRestart').onclick=()=>{ closePause(); startGame(Game.cfg); };",
     "$('#bRestart').onclick=()=>{ closePause(); window.__shellAd(function(){startGame(Game.cfg);},'carroms.pause.restart'); };",
     'pause RESTART'],
  ]],
  ['truth-or-dare', [
    ["$('#btnAgain').onclick=()=>{ S.tap(); Ads.interstitial().then(()=>{ startGame(); }); };",
     "$('#btnAgain').onclick=()=>{ S.tap(); window.__shellAd(function(){ startGame(); },'truthordare.over.again'); };",
     'over AGAIN'],
    ["$('#btnNewParty').onclick=()=>{ S.tap(); Ads.interstitial().then(()=>{ cleanupToSetup(); }); };",
     "$('#btnNewParty').onclick=()=>{ S.tap(); window.__shellAd(function(){ cleanupToSetup(); },'truthordare.over.newparty'); };",
     'over NEW PARTY'],
  ]],
];

for (const [id, jobs] of JOBS) {
  console.log('===== ' + id + ' =====');
  const f = path.join('app/src/main/assets/games', id, 'index.html');
  let s = fs.readFileSync(f, 'utf8');
  for (const [from, to, label] of jobs) {
    if (!s.includes(from)) { console.log('  MISS ' + label); continue; }
    s = s.split(from).join(to);
    console.log('  OK   ' + label);
  }
  fs.writeFileSync(f, s);
}