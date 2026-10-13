'use strict';
const fs = require('fs');
const path = require('path');
const f = path.join('app/src/main/assets/games/mimic', 'index.html');
let s = fs.readFileSync(f, 'utf8');
const EOL = s.includes('\r\n') ? '\r\n' : '\n';
const lines = s.split(/\r?\n/);

const swapIn = (from, to, label) => {
  if (!s.includes(from)) { console.log('MISS ' + label); return; }
  s = s.split(from).join(to); console.log('OK   ' + label);
};

/* ---- ADS ON THE BUTTONS THAT END A RUN ----
   RESUME, the sound toggle and the rewarded REVIVE are deliberately left alone:
   resuming is not a break, and a revive is a reward the player chose. */
swapIn(
  "else if(inR(g.restart,x,y)){ pressId='restart'; pressT=simTime; uiTick(); closePause(); restartMode(); }",
  "else if(inR(g.restart,x,y)){ pressId='restart'; pressT=simTime; uiTick(); closePause();\n" +
  "      studioInterstitial('mimic.pause.restart'); restartMode(); }",
  'pause RESTART');
swapIn(
  "else if(inR(g.quit,x,y)){ pressId='quit'; pressT=simTime; uiTick(); quitToTitle(); }",
  "else if(inR(g.quit,x,y)){ pressId='quit'; pressT=simTime; uiTick();\n" +
  "      studioInterstitial('mimic.pause.quit'); quitToTitle(); }",
  'pause QUIT');
swapIn(
  "if(inR(g.retry,x,y)){ pressId='retry'; pressT=simTime; uiTick(); restartMode(); return; }",
  "if(inR(g.retry,x,y)){ pressId='retry'; pressT=simTime; uiTick(); studioInterstitial('mimic.results.retry'); restartMode(); return; }",
  'results RETRY');
swapIn(
  "if(inR(g.home,x,y)){ pressId='home'; pressT=simTime; uiTick(); quitToTitle(); return; }",
  "if(inR(g.home,x,y)){ pressId='home'; pressT=simTime; uiTick(); studioInterstitial('mimic.results.home'); quitToTitle(); return; }",
  'results HOME');
s = s.replace(
  /if\(inR\(g\.again,x,y\)\)\{ pressId='again'; pressT=simTime; uiTick\(\); duelStartIdx=\(duelStartIdx\+1\)%2; restartMode\(\); return; \}/,
  "if(inR(g.again,x,y)){ pressId='again'; pressT=simTime; uiTick(); studioInterstitial('mimic.res.again'); duelStartIdx=(duelStartIdx+1)%2; restartMode(); return; }",
  'duel AGAIN');
swapIn(
  "if(inR(g.again,x,y)){ pressId='again'; pressT=simTime; uiTick(); restartMode(); return; }",
  "if(inR(g.again,x,y)){ pressId='again'; pressT=simTime; uiTick(); studioInterstitial('mimic.res.again'); restartMode(); return; }",
  'party AGAIN');
s = s.replace(
  /if\(inR\(g\.home2,x,y\)\)\{ pressId='home2'; pressT=simTime; uiTick\(\); quitToTitle\(\); return; \}/g,
  "if(inR(g.home2,x,y)){ pressId='home2'; pressT=simTime; uiTick(); studioInterstitial('mimic.res.home'); quitToTitle(); return; }",
  'result HOME2');

/* ---- BANNER: game page only ----
   prepBoard raised it, quitToTitle dropped it - but the pause and result
   overlays sat over a live board and kept it up, which is the same "still
   there when I open pause" report as the other game. */
swapIn(
  "function openPause(){ if(paused) return; paused=true; popGo('pause'); if(actx) actx.suspend(); }",
  "function openPause(){ if(paused) return; paused=true; popGo('pause'); if(actx) actx.suspend();\n" +
  "  try{ if(window.syncMimicBanner)window.syncMimicBanner(); }catch(e){} }",
  'openPause hides banner');
swapIn(
  "function closePause(){ paused=false;",
  "function closePause(){ paused=false; try{ if(window.syncMimicBanner)window.syncMimicBanner(); }catch(e){}\n  ",
  'closePause restores banner');

/* Exported so the game's own functions, which live outside any IIFE that could
   see it, can drive it - the same scope bug that left the other game's banner
   stuck to a single tap. */
s = s.replace(
  /function tryNativeAd\(kind\)\{/,
  "function syncMimicBanner(){\n" +
  "  try{\n" +
  "    /* Game page only: a board being played, with no overlay on top. The pause\n" +
  "       and result sheets sit over the board but are not the game page, and a\n" +
  "       strip left up over one is the \"still there when I open pause\" case. */\n" +
  "    var want=(screen==='play'&&!overlay&&!paused);\n" +
  "    if(want)tryNativeAd('showBannerAd');else tryNativeAd('hideBannerAd');\n" +
  '  }catch(e){}\n' +
  '}\n' +
  'window.syncMimicBanner=syncMimicBanner;\n' +
  'function tryNativeAd(kind){');
console.log('OK   syncMimicBanner added');

fs.writeFileSync(f, s);

const checks = {
  'ads on run-ending buttons': (s.match(/studioInterstitial\('mimic\./g) || []).length >= 7,
  'resume still ad-free': /if\(inR\(g\.resume,x,y\)\)\{ pressId='resume'; pressT=simTime; uiTick\(\); closePause\(\); \}/.test(s),
  'revive still rewarded': /revivePressed\(\)/.test(s),
  'banner predicate': /function syncMimicBanner/.test(s),
  'banner exported': /window\.syncMimicBanner=/.test(s),
  'pause hides banner': /openPause[\s\S]{0,200}syncMimicBanner/.test(s),
  'title back': /titleBackGeom/.test(s),
  'rewarded 3-arg': /showRewardedAd\(n,placement\|\|'mimic\.continue','REVIVE'\)/.test(s),
  'interstitial 2-arg': /showInterstitial\(n,placement\|\|'mimic'\)/.test(s),
  'setSettings': /setSettings:function\(st\)/.test(s),
  'manifest': /id: mimic/.test(s),
};
Object.entries(checks).forEach(([k, v]) => console.log((v ? 'OK   ' : 'MISS ') + k));