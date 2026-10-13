'use strict';
const fs = require('fs');
const path = require('path');

/* Buttons that END a run get an interstitial, the action running in the ad's
   callback. RESUME / KEEP PLAYING / RE-DRAW and exiting the app stay ad-free. */
const JOBS = [
  ['knot-away', [
    ["on('#btnPauseHome',()=>{closePanels();showScreen('home');});",
     "on('#btnPauseHome',()=>{closePanels();window.__shellAd(function(){showScreen('home');},'knotaway.pause.home');});",
     'pause HOME'],
    ["on('#btnRestart',()=>{closePanels();restartLevel();});",
     "on('#btnRestart',()=>{closePanels();window.__shellAd(function(){restartLevel();},'knotaway.pause.restart');});",
     'pause RESTART'],
    ["on('#btnTryRestart',()=>{closePanels();restartLevel();});",
     "on('#btnTryRestart',()=>{closePanels();window.__shellAd(function(){restartLevel();},'knotaway.over.restart');});",
     'try-again RESTART'],
    ["on('#btnTryHome',()=>{closePanels();showScreen('home');});",
     "on('#btnTryHome',()=>{closePanels();window.__shellAd(function(){showScreen('home');},'knotaway.over.home');});",
     'try-again HOME'],
    ["on('#btnHomeC',()=>{closePanels();showScreen('home');});",
     "on('#btnHomeC',()=>{closePanels();window.__shellAd(function(){showScreen('home');},'knotaway.complete.home');});",
     'complete HOME'],
    ["on('#btnNext',()=>{closePanels();G.lvlIdx+1<totalLevels()?startLevel(G.lvlIdx+1):showScreen('levels')});",
     "on('#btnNext',()=>{closePanels();window.__shellAd(function(){G.lvlIdx+1<totalLevels()?startLevel(G.lvlIdx+1):showScreen('levels');},'knotaway.complete.next');});",
     'NEXT LEVEL'],
  ]],
  ['carroms', [
    [/\$\('#bRestart'\)\.onclick\s*=\s*function\(\)\s*\{([\s\S]{0,80}?)\}/,
     null, 'restart (needs manual)'],
  ]],
  ['truth-or-dare', [
    [/\$\('#btnAgain'\)\.onclick\s*=\s*function\(\)\s*\{([\s\S]{0,140}?)\}/,
     null, 'again (manual)'],
  ]],
];

for (const [id, jobs] of JOBS) {
  console.log('===== ' + id + ' =====');
  const f = path.join('app/src/main/assets/games', id, 'index.html');
  let s = fs.readFileSync(f, 'utf8');
  for (const [from, to, label] of jobs) {
    if (!to) { console.log('  SKIP ' + label + ' - needs manual wiring'); continue; }
    if (!s.includes(from)) { console.log('  MISS ' + label); continue; }
    s = s.split(from).join(to);
    console.log('  OK   ' + label);
  }
  fs.writeFileSync(f, s);
}

/* What still needs doing by hand - report it rather than guess. */
console.log('\n--- handlers left for manual wiring ---');
for (const id of ['carroms', 'truth-or-dare']) {
  const f = path.join('app/src/main/assets/games', id, 'index.html');
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  lines.forEach((l, i) => {
    if (/onclick\s*=|addEventListener\('click'/.test(l) && /bRestart|bAgain|bHome|bNewParty|btnAgain|btnHome|btnNewParty|btnQuit|btnLeave/.test(l)) {
      console.log('  ' + id + ':' + (i + 1) + ' | ' + l.trim().slice(0, 96));
    }
  });
}