'use strict';
const fs = require('fs');
const path = require('path');

const SRC = 'sources/Playable Games/Mimic.html';
const DIR = 'app/src/main/assets/games/mimic';
const OUT = path.join(DIR, 'index.html');
fs.mkdirSync(DIR, { recursive: true });
let s = fs.readFileSync(SRC, 'utf8');

const swap = (from, to, label) => {
  if (from instanceof RegExp) {
    if (!from.test(s)) { console.log('MISS ' + label); return; }
    s = s.replace(from, to); console.log('OK   ' + label); return;
  }
  if (!s.includes(from)) { console.log('MISS ' + label); return; }
  s = s.split(from).join(to); console.log('OK   ' + label);
};

/* ---------- manifest ---------- */
if (!/STUDIO_GAME_MANIFEST/.test(s)) {
  s = s.replace('<!DOCTYPE html>', '<!DOCTYPE html>\n<!--\n' +
    'STUDIO_GAME_MANIFEST\n' +
    'id: mimic\n' +
    'title: Mimic\n' +
    'orientation: portrait\n' +
    'minPlayers: 1\n' +
    'maxPlayers: 5\n' +
    'aiSupport: full\n' +
    'online: false\n' +
    'tileColor: #E9D7C3\n' +
    'banner: bottom\n' +
    'bannerBg: #E4CBB1\n' +
    'version: 1\n' +
    'released: 2026-10-11\n' +
    '-->\n');
  console.log('OK   manifest');
}

/* ---------- 1. THE BROKEN AD BRIDGE ----------
   Every ad in this game went through `b[kind]()` - the bridge method called with
   ZERO arguments. The shell matches its methods by EXACT arity:
   showInterstitial needs (callback, placement) and showBanner needs none but is
   named differently. So every interstitial, and both banner calls, silently did
   nothing. Replaced with correct calls. */
swap(
  /function tryNativeAd\(kind\)\{\r?\n  try\{\r?\n    var b=window\.NativeBridge;\r?\n    if\(b && typeof b\[kind\]==='function'\) b\[kind\]\(\);\r?\n  \}catch\(e\)\{\}\r?\n\}/,
  'var adSeq=0;\n' +
  'function studioInterstitial(placement){\n' +
  "  try{\n" +
  '    var b=window.NativeBridge;\n' +
  '    if(!b||!b.showInterstitial)return;\n' +
  "    var n='__studioInterCb'+(++adSeq);\n" +
  '    window[n]=function(){try{delete window[n]}catch(e){}};\n' +
  "    b.showInterstitial(n,placement||'mimic');\n" +
  '  }catch(e){}\n' +
  '}\n' +
  'function tryNativeAd(kind){\n' +
  '  try{\n' +
  '    var b=window.NativeBridge;\n' +
  '    if(!b)return;\n' +
  "    if(kind==='showInterstitialAd'){studioInterstitial('mimic.break');return}\n" +
  "    if(kind==='showBannerAd'){if(b.showBanner)b.showBanner();return}\n" +
  "    if(kind==='hideBannerAd'){if(b.hideBanner)b.hideBanner();return}\n" +
  '  }catch(e){}\n' +
  '}',
  'ad bridge arity fixed');

/* ---------- 2. REWARDED: the existing call drops placement and kind ---------- */
swap(
  /Studio\.ads\.rewarded=function\(placement,onReward\)\{\s*\n\s*var b=bridge\(\); if\(!b\) return;\s*\n\s*window\.__studioAdCb=function\(result\)\{ if\(result==='granted'\) onReward\(\); \};\s*\n\s*b\.showRewardedAd\('__studioAdCb'\);/,
  'Studio.ads.rewarded=function(placement,onReward){\n' +
  '  var b=bridge(); if(!b) return;\n' +
  '  /* Three arguments: showRewardedAd(callback, placement, kind). Passing one\n' +
  "     meant the bridge found no callback, so a watched ad paid out nothing.\n" +
  "     Each request also gets its OWN name - one shared global was how two\n" +
  '     overlapping requests overwrote each other. */\n' +
  '  var n="__studioAdCb"+(++adSeq);\n' +
  "  window[n]=function(result){ try{delete window[n]}catch(e){}\n" +
  "    if(result==='granted'||result===true) onReward(); };\n" +
  "  try{ b.showRewardedAd(n,placement||'mimic.continue','REVIVE'); }catch(e){}\n" +
  '};',
  'rewarded arity fixed');

/* ---------- 3. SETTINGS: the shell owns them, live ---------- */
swap(
  /window\.Studio=settings,ads:\{rewarded/,
  "  /* The shell's query string wins at boot; Game.setSettings keeps it live. */\n" +
  '  settings.sound=(function(){var q=getQ2("sound");return q==null?settings.sound:q==="1"})();\n' +
  '  settings.haptics=(function(){var q=getQ2("vibe");return q==null?settings.haptics:q==="1"})();\n' +
  '  settings.volume=(function(){var q=getQ2("vol");var n=q==null?null:parseFloat(q);\n' +
  '    return (n==null||isNaN(n))?1:clamp0(n>1?n/100:n,0,1)})();\n' +
  '  window.Studio=settings,ads:{rewarded',
  'shell settings at boot');
swap(
  /window\.Studio=settings,ads:\{rewarded:function\(placement,onReward\)\{/,
  'window.Studio=settings,ads:{rewarded:function(placement,onReward){',
  'noop');

/* ---------- 4. BACK on the title screen ----------
   The title is a canvas, so the button is a drawn hit-box, not a DOM node. */
swap(
  /if\(screen==='title'\)\{ titleHit\(x,y\); return; \}/,
  "if(screen==='title'){\n" +
  "    /* Back to the shell, drawn as a hit-box because the title is canvas-only. */\n" +
  '    if(titleBackGeom()&&inR(titleBackGeom(),x,y)){ uiTick(); tryNativeExit(); return; }\n' +
  '    titleHit(x,y); return;\n' +
  '  }',
  'title back hit-box');
swap(
  /function relayout\(\)\{/,
  'function titleBackGeom(){ return {x:14,y:safe.t+10,w:42,h:42}; }\n' +
  'function tryNativeExit(){ try{ var b=window.NativeBridge; if(b&&b.exitGame)b.exitGame(); }catch(e){} }\n' +
  'function relayout(){',
  'title back helpers');

fs.writeFileSync(OUT, s);
console.log('written:', OUT);