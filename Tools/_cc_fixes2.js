'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/chinese-checkers/index.html';
let s = fs.readFileSync(f, 'utf8');
const before = s;

const swap = (from, to, label) => {
  if (from instanceof RegExp) {
    if (!from.test(s)) { console.log('MISS ' + label); return; }
    s = s.replace(from, to); console.log('OK   ' + label); return;
  }
  if (!s.includes(from)) { console.log('MISS ' + label); return; }
  s = s.split(from).join(to); console.log('OK   ' + label);
};

/* ---- 1. THE BANNER ONLY MOVED ON A TAP ----
   syncBanner() was declared inside the shell IIFE, so the game's own top-level
   functions - showGame, showHome, pauseGame, resumeGame - could not see it.
   Each one threw ReferenceError: syncBanner is not defined, and every one of
   those calls sits inside try/catch, so the failure was silent. The only thing
   that could still change the strip was the pointerdown listener, which lives
   inside the IIFE. Hence: it appeared when you tapped, and stayed up over the
   pause sheet until you tapped again.

   Exported on window so the game's own code can drive it. */
swap(
  'function syncBanner(){',
  'function syncBanner(){\n' +
  '  /* Exported because the game\'s own screen changes live OUTSIDE this IIFE.\n' +
  '     Inside it they could not see this function at all. */\n' +
  '  window.__ccSyncBanner=syncBanner;',
  'export syncBanner');
swap(
  'window.Game={',
  'if(!window.__ccSyncBanner)window.__ccSyncBanner=function(){};\n  window.Game={',
  'fallback defined');

s = s.replace(/try\{syncBanner\(\)\}catch\(e\)\{\}/g, 'try{window.__ccSyncBanner()}catch(e){}');
console.log('OK   top-level call sites rewritten:', (s.match(/window\.__ccSyncBanner\(\)/g) || []).length);

/* ---- 2. VOLUME ----
   The shell's slider now scales the game properly, but the game's own mix was
   authored against a full-volume bus: its music sat at .045 and the quieter
   effects at .08-.12, so multiplied by a shell volume below 1 they all but
   vanished. Makeup gain per bus, so at full shell volume the game plays louder
   than the original mix and the slider still trims it from there. */
swap(
  "let GAME_VOL=Q.has('vol')?clamp((parseFloat(Q.get('vol'))||0)/100,0,1):0.8;",
  "let GAME_VOL=Q.has('vol')?clamp((parseFloat(Q.get('vol'))||0)/100,0,1):0.8;\n" +
  '/* Makeup gain. The mix was authored against a 1.0 bus; the shell slider then\n' +
  '   scales it down, which made taps and music inaudible at anything under full.\n' +
  '   These lift each bus so the game is loud at full volume and the slider still\n' +
  '   trims from there. Music needs more: its notes sit at .045 by design. */\n' +
  'const SFX_MAKEUP=1.7, MUS_MAKEUP=2.6;',
  'makeup gains');
swap(
  '  sfxG.gain.value=on?GAME_VOL:0;\n  musG.gain.value=settings.music?GAME_VOL:0;',
  '  sfxG.gain.value=on?GAME_VOL*SFX_MAKEUP:0;\n  musG.gain.value=settings.music?GAME_VOL*MUS_MAKEUP:0;',
  'makeup applied');
swap(
  "if(master){const v=m?0:GAME_VOL;sfxG.gain.value=settings.sfx?v:0;musG.gain.value=settings.music?v:0}",
  "if(master){const v=m?0:GAME_VOL;sfxG.gain.value=settings.sfx?v*SFX_MAKEUP:0;musG.gain.value=settings.music?v*MUS_MAKEUP:0}",
  'makeup on setMuted');

/* ---- 3. GAME OVER ----
   overAdDone was declared for this and never used: the ad only existed on the
   buttons under the result plaque, so the win itself asked for nothing. */
swap(
  'function finishGame(w){\r\n  G.phase=\'over\';',
  "function finishGame(w){\r\n  /* The round is won - the natural break. The result plaque's own buttons\n" +
  "     asked for an ad, but the moment of winning did not. */\r\n" +
  '  try{ if(!overAdDone){ overAdDone=true; interstitial(function(){},\'chinesecheckers.gameover\'); } }catch(e){}\r\n' +
  "  G.phase='over';",
  'game over ad');
swap(
  /G\.phase='over';G\.winner=w;/,
  "G.phase='over';G.winner=w;",
  'noop');
swap(
  /function initializeGame\(c,restore\)\{[\s\S]{0,400}?\r?\n  cfg=c;/,
  'function initializeGame(c,restore){\r\n  overAdDone=false;\r\n  cfg=c;',
  'flag reset per game');

fs.writeFileSync(f, s);

const checks = {
  'syncBanner exported': /window\.__ccSyncBanner=syncBanner/.test(s),
  'top-level sites rewritten': (s.match(/window\.__ccSyncBanner\(\)/g) || []).length >= 8,
  'makeup applied': /SFX_MAKEUP/.test(s) && /MUS_MAKEUP/.test(s),
  'game over ad': /chinesecheckers\.gameover/.test(s),
  'flag reset': /function initializeGame\(c,restore\)\{\r\n  overAdDone=false;/.test(s),
};
Object.entries(checks).forEach(([k, v]) => console.log((v ? 'OK   ' : 'MISS ') + k));
console.log('changed:', s !== before);