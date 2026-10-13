'use strict';
const fs = require('fs');
const path = require('path');

const G = [
  {
    id: 'knot-away', home: 'home', game: 'game',
    // screens: showScreen(name) is the single router
    patches: [
      [/function showScreen\(name\)\{/,
       "function showScreen(name){\n  /* The shell polls this to decide whether to show the banner and the\n" +
       "     back button, so every route through the game is covered. */\n" +
       "  try{ window.__shellScreen=name; }catch(e){}", 'screen router'],
      [/function gameOverSequence\(reason\)\{/,
       "function gameOverSequence(reason){\n" +
       "  /* The level is lost - the natural break. Nothing asked for an ad here\n" +
       "     before; only the buttons on the try-again panel did. */\n" +
       "  try{ if(!window.__shellOverAd){ window.__shellOverAd=1;\n" +
       "    window.__shellAd(function(){},'knotaway.gameover'); } }catch(e){}", 'game over ad'],
      [/(function startLevel\(\)\{|\nfunction restartLevel\(\)\{)/,
       "$1\n  try{ window.__shellOverAd=0; }catch(e){}", 'over-ad reset'],
    ],
    buttons: [
      [/on\('#btnPauseHome',\(\)=>\{closePanels\(\);showScreen\('home'\)\}\);/,
       "on('#btnPauseHome',()=>{closePanels();window.__shellAd(function(){showScreen('home');},'knotaway.pause.home');});", 'pause HOME'],
      [/on\('#btnTryHome',\(\)=>\{closePanels\(\);showScreen\('home'\)\}\);/,
       "on('#btnTryHome',()=>{closePanels();window.__shellAd(function(){showScreen('home');},'knotaway.over.home');});", 'try-again HOME'],
      [/on\('#btnHomeC',\(\)=>\{closePanels\(\);showScreen\('home'\)\}\);/,
       "on('#btnHomeC',()=>{closePanels();window.__shellAd(function(){showScreen('home');},'knotaway.complete.home');});", 'complete HOME'],
      [/on\('#btnNext',\(\)=>\{closePanels\(\);/,
       "on('#btnNext',()=>{closePanels();window.__shellAd(function(){", 'next level'],
      [/on\('#btnTryRestart',\(\)=>\{closePanels\(\);restartLevel\(\)\}\);/,
       "on('#btnTryRestart',()=>{closePanels();window.__shellAd(function(){restartLevel();},'knotaway.over.restart');});", 'try-again RESTART'],
      [/on\('#btnRestart',\(\)=>\{closePanels\(\);restartLevel\(\)\}\);/,
       "on('#btnRestart',()=>{closePanels();window.__shellAd(function(){restartLevel();},'knotaway.pause.restart');});", 'pause RESTART'],
    ],
    closeButton: [/G\.lvlIdx\+1<totalLevels\(\)\?startLevel\(G\.lvlIdx\+1\):showScreen\('levels'\)\}\);/,
      "G.lvlIdx+1<totalLevels()?startLevel(G.lvlIdx+1):showScreen('levels')});});", 'next close'],
  },

  {
    id: 'carroms', home: 'home', game: 'table',
    patches: [
      [/function showHome\(\)\{/, "function showHome(){\n  try{ window.__shellScreen='home'; }catch(e){}", 'showHome sets screen'],
      [/function startGame\(cfg\)\{/, "function startGame(cfg){\n  try{ window.__shellScreen='table'; }catch(e){}", 'startGame sets screen'],
      [/function gameOver\(p\)\{/,
       "function gameOver(p){\n" +
       "  /* The game is over - the natural break. Only the buttons on the board-end\n" +
       "     card asked for an ad before. */\n" +
       "  try{ if(!window.__shellOverAd){ window.__shellOverAd=1;\n" +
       "    window.__shellAd(function(){},'carroms.gameover'); } }catch(e){}", 'game over ad'],
      [/function resetStriker\(\)\{/, "function resetStriker(){\n  try{ window.__shellOverAd=0; }catch(e){}", 'over-ad reset'],
    ],
    buttons: [
      [/bRestart[^\n]*restartGame\(/, null, 'restart (manual)'],
    ],
    closeButton: [],
  },

  {
    id: 'truth-or-dare', home: 'title', game: 'play',
    patches: [
      [/function startGame\(\)\{/, "function startGame(){\n  try{ window.__shellScreen='play'; }catch(e){}", 'startGame sets screen'],
      [/function finishGame\(\)\{/,
       "function finishGame(){\n" +
       "  /* The round is over - the natural break. */\n" +
       "  try{ if(!window.__shellOverAd){ window.__shellOverAd=1;\n" +
       "    window.__shellAd(function(){},'truthordare.gameover'); } }catch(e){}", 'game over ad'],
      [/function startGame\(\)\{\r?\n  try\{ window\.__shellScreen='play'; \}/,
       "function startGame(){\n  try{ window.__shellOverAd=0; window.__shellScreen='play'; }", 'over-ad reset'],
    ],
    buttons: [
      [/btnAgain/, null, 'play again (manual)'],
      [/btnNewParty/, null, 'new party (manual)'],
    ],
    closeButton: [],
  },
];

for (const g of G) {
  const f = path.join('app/src/main/assets/games', g.id, 'index.html');
  let s = fs.readFileSync(f, 'utf8');
  const EOL = s.includes('\r\n') ? '\r\n' : '\n';
  const lines = s.split(/\r?\n/);
  console.log('===== ' + g.id + ' =====');

  const applyAt = (re, insertLines, label) => {
    const i = lines.findIndex(l => re.test(l));
    if (i < 0) { console.log('  MISS ' + label); return; }
    lines.splice(i + 1, 0, ...insertLines);
    console.log('  OK   ' + label);
  };

  for (const [re, block, label] of g.patches) {
    if (typeof block !== 'string') continue;
    const i = lines.findIndex(l => re.test(l));
    if (i < 0) { console.log('  MISS ' + label); continue; }
    lines.splice(i, 1, ...block.split('\n'));
    console.log('  OK   ' + label);
  }
  fs.writeFileSync(f, lines.join(EOL));
}