'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/chess/index.html';
let s = fs.readFileSync(f, 'utf8');
const before = s;

/* ---- 1. PUZZLE HUB SAVING WAS BROKEN ----
   pzSinceAd is the "how many free puzzles since the last unlock" counter that
   gates the rewarded ad. It lived in a plain variable, so it started at 0 on
   every launch: the five-free-puzzles allowance silently reset each time the
   app was opened. stats.solved[] (the hub's lifetime total) was saved fine -
   this was a separate counter, and it was the one that decided whether the
   player had to watch an ad. */
s = s.replace('  statsKey: "chess:stats:v1",',
  '  statsKey: "chess:stats:v1",\n' +
  '  /* The free-puzzle allowance lives across launches. It was a plain variable\n' +
  '     that started at 0 every session, so the five-free-puzzles gate reset\n' +
  '     itself every time the app was opened. */\n' +
  '  puzzleCountKey: "chess:puzzlecount:v1",');

s = s.replace('let pzSinceAd = 0;',
  'let pzSinceAd = 0;\n' +
  'function loadPuzzleCount(){ try{ const raw=Studio.load(CFG.puzzleCountKey); pzSinceAd=raw?Math.max(0,parseInt(raw,10)||0):0; }catch(e){ pzSinceAd=0; } }\n' +
  'function savePuzzleCount(){ try{ Studio.save(CFG.puzzleCountKey, String(pzSinceAd)); }catch(e){} }');

s = s.replace('  pzSinceAd++;', '  pzSinceAd++;\n  savePuzzleCount();');
s = s.replace('  pzSinceAd = 0;\n  startPuzzle(p.entry, p.tier, p.daily);',
  '  pzSinceAd = 0;\n  savePuzzleCount();\n  startPuzzle(p.entry, p.tier, p.daily);');

/* Load beside loadStats() at boot. */
s = s.replace(/\n(\s*)loadStats\(\);/, '\n$1loadStats();\n$1loadPuzzleCount();');

/* ---- 2. ADS ---- */

/* Game over, including resign. chessOverSheet() is the single point all three
   endings reach (checkmate ~2081, the short-delay path ~2084, and doResign
   ~2247), and it asked for nothing - only the result sheet's own buttons did,
   so losing showed no ad until the player tapped REMATCH or MAIN MENU. */
s = s.replace('function chessOverSheet(){\n  endIsChess=true;',
  'function chessOverSheet(){\n  endIsChess=true;\n' +
  '  /* The game is over - the natural break. This includes resign, which lands\n' +
  '     here too. Only the buttons below asked for an ad before. */\n' +
  '  try{ gameInterstitial(function(){}); }catch(e){}');

/* Pause NEW GAME and MAIN MENU. RESUME stays ad-free - it is not a break, and
   charging for it punishes a tap the player had to make to keep playing. */
s = s.replace('    armConfirm(pNew,function(){ newGame(); closeModal(); });',
  '    /* Starting over and walking away from a live board both end this session.\n' +
  '       Neither asked for an ad before. */\n' +
  '    armConfirm(pNew,function(){ gameInterstitial(function(){ newGame(); closeModal(); }); });');

s = s.replace('  pMenu.addEventListener("click",function(){ AudioSys.play("tap"); closeModal(); showScreen("intro"); });',
  '  pMenu.addEventListener("click",function(){ AudioSys.play("tap"); closeModal();\n' +
  '    gameInterstitial(function(){ showScreen("intro"); }); });');

fs.writeFileSync(f, s);

const checks = {
  'puzzle counter key added': /puzzleCountKey: "chess:puzzlecount:v1"/.test(s),
  'counter loads at boot': /loadPuzzleCount\(\)/.test(s) && /loadStats\(\);[\s\S]{0,40}loadPuzzleCount\(\);/.test(s),
  'counter saved on solve': /pzSinceAd\+\+;\s*\n\s*savePuzzleCount\(\);/.test(s),
  'counter saved on unlock': /pzSinceAd = 0;\s*\n\s*savePuzzleCount\(\);/.test(s),
  'game over ad (covers resign)': /function chessOverSheet\(\)\{\s*\n\s*endIsChess=true;[\s\S]{0,220}gameInterstitial/.test(s),
  'pause NEW GAME ad': /armConfirm\(pNew,function\(\)\{ gameInterstitial/.test(s),
  'pause MAIN MENU ad': /pMenu[\s\S]{0,190}gameInterstitial/.test(s),
  'RESUME still ad-free': /pResume\.addEventListener\("click",function\(\)\{ AudioSys\.play\("tap"\); closeModal\(\); \}\);/.test(s),
  'existing over-sheet ads kept': /endPfn|endSfn/.test(s),
  'changed': s !== before,
};
Object.entries(checks).forEach(([k, v]) => console.log((v ? 'OK   ' : 'MISS ') + k));