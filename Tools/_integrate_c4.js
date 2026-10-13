'use strict';
const fs = require('fs');
const path = require('path');

const SRC = 'sources/Playable Games/ConnectFour.html';
const OUT_DIR = path.join('app/src/main/assets/games', 'connect-four');
const OUT = path.join(OUT_DIR, 'index.html');

fs.mkdirSync(OUT_DIR, { recursive: true });
let s = fs.readFileSync(SRC, 'utf8');
const applied = [];
const swap = (from, to, label) => {
  const re = from instanceof RegExp ? from : new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  if (!re.test(s)) { console.log('  MISS ' + label); return false; }
  s = s.replace(re, to); applied.push(label); console.log('  OK   ' + label); return true;
};

const eol = s.includes('\r\n') ? '\r\n' : '\n';
const L = (...a) => a.join(eol);

/* ------------------------------------------------------------------ *
 * 1. MANIFEST. ManifestParser.scanGames() only reads the first 30
 *    lines and skips anything without the marker, so it has to be at
 *    the very top. Connect Four is pass-and-play 2P but also plays as
 *    1P against the bot, so it spans 1-2 the same way Chess does.
 * ------------------------------------------------------------------ */
swap(/^<!DOCTYPE html>\r?\n/, L(
  '<!DOCTYPE html>',
  '<!--',
  'STUDIO_GAME_MANIFEST',
  'id: connect-four',
  'title: Connect Four',
  'orientation: portrait',
  'minPlayers: 1',
  'maxPlayers: 2',
  'aiSupport: full',
  'online: false',
  'tileColor: #B0824B',
  'tileGlyph: 4',
  'banner: bottom',
  'bannerBg: #150C05',
  'version: 1',
  'released: 2026-10-12',
  '-->',
  ''), 'manifest');

/* ------------------------------------------------------------------ *
 * 2. STORAGE. kv() wrapped localStorage in a try/catch with a memory
 *    fallback. Everything Connect Four persists - the settings and the
 *    in-progress board behind CONTINUE - went through it, so all of it
 *    died with a data clear. NativeBridge.save/load are the shell's
 *    own store; prefer them and keep localStorage as the fallback.
 * ------------------------------------------------------------------ */
swap(
  /const memKV=\{\};\r?\nconst kv=\{\r?\n  s\(k,v\)\{try\{localStorage\.setItem\(k,v\)\}catch\(e\)\{memKV\[k\]=v\}\},\r?\n  g\(k\)\{try\{return localStorage\.getItem\(k\)\}catch\(e\)\{return memKV\[k\]!=null\?memKV\[k\]:null\}\},\r?\n  d\(k\)\{try\{localStorage\.removeItem\(k\)\}catch\(e\)\{delete memKV\[k\]\}\}\r?\n\};/,
  L(
    'const memKV={};',
    'const SB=(typeof window!=="undefined")&&window.NativeBridge;',
    'const kv={',
    '  /* The shell owns the store, so a saved game and the settings survive a',
    '     data clear. localStorage stays as the fallback for a plain browser tab,',
    '     and memKV is the last resort if both are unavailable. */',
    '  s(k,v){ try{ if(SB&&SB.save){ SB.save(k,String(v)); return; } }catch(e){}',
    '        try{localStorage.setItem(k,v)}catch(e){memKV[k]=v} },',
    '  g(k){ try{ if(SB&&SB.load){ var b=SB.load(k); if(b!=null&&b!=="")return b; } }catch(e){}',
    '      try{return localStorage.getItem(k)}catch(e){return memKV[k]!=null?memKV[k]:null} },',
    '  d(k){ try{ if(SB&&SB.save){ SB.save(k,""); return; } }catch(e){}',
    '      try{localStorage.removeItem(k)}catch(e){delete memKV[k]} }',
    '};'), 'shell-backed storage');

/* ------------------------------------------------------------------ *
 * 3. VOLUME. Every voice ran through one master gain pinned at .95, so
 *    the shell's volume slider did nothing to this game at all - the
 *    same missing-master problem Bomb Relay had.
 * ------------------------------------------------------------------ */
swap(
  /  let ctx=null,master=null,wet=null,noiseBuf=null;/,
  '  let ctx=null,master=null,wet=null,noiseBuf=null;\n' +
  '  /* Shell volume, 0-1, applied to the single master gain. */\n' +
  '  let vol=1;',
  'volume state');

swap(
  /master=ctx\.createGain\(\);master\.gain\.value=\.95;/,
  'master=ctx.createGain();master.gain.value=.95*vol;',
  'master honours volume');

swap(
  /  return\{\r?\n    unlock\(\)\{ac\(\);\}/,
  '  return{\n' +
  '    unlock(){ac();},\n' +
  '    setVolume(v){ vol=(v==null?1:(v>1?v/100:v)); if(vol<0)vol=0; if(vol>1)vol=1;\n' +
  '      try{ if(master) master.gain.value=.95*vol; }catch(e){} },\n' +
  '    volume(){ return vol; },',
  'setVolume exposed');

/* ------------------------------------------------------------------ *
 * 4. BOOT THE AUDIO GRAPH. The graph was only built from the first
 *    pointerdown, so the game opened silent and that first tap did
 *    nothing except arm audio. The shell lifts Chromium's autoplay gate,
 *    so it can be built on load.
 * ------------------------------------------------------------------ */
swap(
  /addEventListener\('pointerdown',\(\)=>SFX\.unlock\(\),\{once:true\}\);/,
  L(
    "/* Was: built on the first pointerdown, so the game opened silent and the",
    "   first tap only armed audio instead of doing what it hit. The shell",
    "   lifts the autoplay gesture gate, so build it on load. The listener is",
    "   kept as a harmless retry. */",
    'try{ SFX.unlock(); }catch(e){}',
    "addEventListener('pointerdown',()=>SFX.unlock(),{once:true});"),
  'audio graph at boot');

/* ------------------------------------------------------------------ *
 * 5. SCREEN STATE + BANNER GATING.
 * ------------------------------------------------------------------ */
swap(
  /function showIntro\(\)\{\r?\n  howtoEl\.classList\.remove\('on'\);setEl\.classList\.remove\('on'\);\r?\n  introEl\.classList\.remove\('off'\);\r?\n  barEl\.classList\.add\('hide'\);statusEl\.classList\.add\('hide'\);\r?\n  updateContBtn\(\);\r?\n\}/,
  'function showIntro(){\n' +
  '  howtoEl.classList.remove(\'on\');setEl.classList.remove(\'on\');\n' +
  "  introEl.classList.remove('off');\n" +
  "  barEl.classList.add('hide');statusEl.classList.add('hide');\n" +
  '  updateContBtn();\n' +
  '  shellScreen("home");\n' +
  '}',
  'intro = home screen');

swap(
  /function closeIntro\(\)\{\r?\n  introEl\.classList\.add\('off'\);\r?\n  barEl\.classList\.remove\('hide'\);statusEl\.classList\.remove\('hide'\);\r?\n  setTimeout\(resize,50\);\r?\n\}/,
  'function closeIntro(){\n' +
  "  introEl.classList.add('off');\n" +
  "  barEl.classList.remove('hide');statusEl.classList.remove('hide');\n" +
  '  setTimeout(resize,50);\n' +
  '  shellScreen("game");\n' +
  '}',
  'play = game screen');

swap(
  /function refreshUI\(\)\{/,
  L(
    '/* ---------- shell: which page are we on, and is a sheet covering it ---------- */',
    '/* The banner belongs on the game page only. The status plaque, HOW TO PLAY',
    '   and SETTINGS are all overlays drawn over that same page, so each of them',
    '   has to block the strip or it shows through. */',
    'function shellScreen(sc){',
    '  try{ window.__shellScreen=sc; window.__shellScreenSync(); }catch(e){}',
    '}',
    'function shellBlock(on){',
    '  try{ if(window.__shellBlock) window.__shellBlock(on); }catch(e){}',
    '}',
    'function syncShellOverlay(){',
    '  var covered=(howtoEl.classList.contains(\'on\')||setEl.classList.contains(\'on\')||',
    '               document.getElementById(\'plaque\').classList.contains(\'on\'));',
    '  shellBlock(covered);',
    '}',
    'function refreshUI(){'),
  'shell screen helpers');

/* Any overlay going up or down re-evaluates the strip. */
swap(
  /\$\('#btnHow'\)\.addEventListener\('click',\(\)=>\{SFX\.tap\(\);howtoEl\.classList\.add\('on'\);\}\);/,
  " $('#btnHow').addEventListener('click',()=>{SFX.tap();howtoEl.classList.add('on');syncShellOverlay();});",
  'how-to blocks banner');
swap(
  /\$\('#btnHowOk'\)\.addEventListener\('click',\(\)=>\{SFX\.tap\(\);howtoEl\.classList\.remove\('on'\);\}\);/,
  " $('#btnHowOk').addEventListener('click',()=>{SFX.tap();howtoEl.classList.remove('on');syncShellOverlay();});",
  'how-to close unblocks');
swap(
  /  if\(setEl\.classList\.contains\('on'\)\)setEl\.classList\.remove\('on'\);\r?\n  else\{howtoEl\.classList\.remove\('on'\);setEl\.classList\.add\('on'\);\r?\n  \}\r?\n\}\);/,
  "  if(setEl.classList.contains('on'))setEl.classList.remove('on');\n" +
  "  else{howtoEl.classList.remove('on');setEl.classList.add('on');}\n" +
  '  syncShellOverlay();\n' +
  '});',
  'settings block banner');
swap(
  /\$\('#btnSetOk'\)\.addEventListener\('click',\(\)=>\{SFX\.tap\(\);setEl\.classList\.remove\('on'\);\}\);/,
  " $('#btnSetOk').addEventListener('click',()=>{SFX.tap();setEl.classList.remove('on');syncShellOverlay();});",
  'settings close unblocks');
swap(
  /  \$\('#pveil'\)\.classList\.add\('on'\);\r?\n  \$\('#plaque'\)\.classList\.add\('on'\);/,
  "  $('#pveil').classList.add('on');\n" +
  "  $('#plaque').classList.add('on');\n" +
  '  syncShellOverlay();',
  'plaque blocks banner');
swap(
  /  \$\('#pveil'\)\.classList\.remove\('on'\);\r?\n  \$\('#plaque'\)\.classList\.remove\('on'\);/,
  "  $('#pveil').classList.remove('on');\n" +
  "  $('#plaque').classList.remove('on');\n" +
  '  syncShellOverlay();',
  'plaque close unblocks');

/* ------------------------------------------------------------------ *
 * 6. ADS. A finished match is the natural break, and PLAY AGAIN plus
 *    RESTART both throw the board away. MENU and the shell back button
 *    are exits and stay ad-free.
 * ------------------------------------------------------------------ */
swap(
  /  const seq=\+\+S\.seq;\r?\n  setTimeout\(\(\)=>\{if\(seq===S\.seq\)showPlaque\(m\.p\);\},1050\);/,
  '  const seq=++S.seq;\n' +
  '  /* A finished match. */\n' +
  "  shellAd(function(){ setTimeout(function(){ if(seq===S.seq) showPlaque(m.p); },1050); },'connectfour.over.win');",
  'win interstitial');
swap(
  /  const seq=\+\+S\.seq;\r?\n  setTimeout\(\(\)=>\{if\(seq===S\.seq\)showPlaque\(0\);\},800\);/,
  '  const seq=++S.seq;\n' +
  '  /* A finished match. */\n' +
  "  shellAd(function(){ setTimeout(function(){ if(seq===S.seq) showPlaque(0); },800); },'connectfour.over.draw');",
  'draw interstitial');

swap(
  /\$\('#btnAgain'\)\.addEventListener\('click',\(\)=>\{\r?\n  SFX\.tap\(\);startClearing\(\{toggle:true,then:afterReset\}\);\r?\n\}\);/,
  "$('#btnAgain').addEventListener('click',()=>{\n" +
  '  SFX.tap();\n' +
  "  shellAd(function(){ startClearing({toggle:true,then:afterReset}); },'connectfour.playagain');\n" +
  '});',
  'play again interstitial');

swap(
  /\$\('#btnRe'\)\.addEventListener\('click',\(\)=>\{\r?\n  SFX\.tap\(\);\r?\n  if\(S\.phase==='clearing'\)return;\r?\n  if\(S\.marbles\.length\)startClearing\(\{then:afterReset\}\);\r?\n  else afterReset\(\);\r?\n\}\);/,
  "$('#btnRe').addEventListener('click',()=>{\n" +
  '  SFX.tap();\n' +
  "  if(S.phase==='clearing')return;\n" +
  '  shellAd(function(){\n' +
  "    if(S.marbles.length) startClearing({then:afterReset});\n" +
  '    else afterReset();\n' +
  "  },'connectfour.restart');\n" +
  '});',
  'restart interstitial');

/* Ad helper - falls through silently when there is no shell. */
swap(
  /const \$=s=>document\.querySelector\(s\);/,
  L(
    'const $=s=>document.querySelector(s);',
    '/* Interstitial helper. No bridge (plain browser tab) means no ad and the',
    '   action runs straight away. */',
    'function shellAd(cb,placement){',
    '  try{',
    '    if(window.__shellAd){ window.__shellAd(cb,placement); return; }',
    '  }catch(e){}',
    '  if(cb)cb();',
    '}'),
  'shellAd helper');

/* ------------------------------------------------------------------ *
 * 7. BOOT. Take sound/haptics/volume from the shell's settings.
 * ------------------------------------------------------------------ */
swap(
  / \$\('#swSnd'\)\.addEventListener\('click',\(\)=>\{\r?\n  S\.sound=!S\.sound;persistSet\(\);renderSet\(\);\r?\n  if\(S\.sound\)\{SFX\.unlock\(\);SFX\.tap\(\);\}\r?\n\}\);/,
  " $('#swSnd').addEventListener('click',()=>{\n" +
  '  S.sound=!S.sound;persistSet();renderSet();\n' +
  '  try{ SFX.setVolume(S.sound?shellVol():0); }catch(e){}\n' +
  '  if(S.sound){SFX.unlock();SFX.tap();}\n' +
  '});',
  'sound toggle applies volume');

swap(
  /^resize\(\);\r?\nshowIntro\(\);\r?\nrefreshUI\(\);/m,
  L(
    '/* The shell owns the settings. Seed from them on boot so the in-game',
    '   switches agree with the shell sliders, then keep them live through',
    '   Game.setSettings. */',
    'function shellVol(){',
    '  try{ var v=window.Studio&&window.Studio.settings&&window.Studio.settings.volume;',
    '       return (v==null?1:(v>1?v/100:v)); }catch(e){ return 1; }',
    '}',
    'function applyShellSettings(st){',
    '  try{',
    '    var s=st||(window.Studio&&window.Studio.settings);',
    '    if(!s)return;',
    '    if(typeof s.sound===\'boolean\'){ S.sound=s.sound; }',
    '    if(typeof s.haptics===\'boolean\'){ S.haptics=s.haptics; }',
    '    var v=(s.volume==null?1:(s.volume>1?s.volume/100:s.volume));',
    '    SFX.setVolume(S.sound?v:0);',
    '    renderSet();persistSet();',
    '  }catch(e){}',
    '}',
    'window.Game={',
    '  pause:function(){ try{ window.__shellPaused=true; }catch(e){} },',
    '  resume:function(){ try{ window.__shellPaused=false; }catch(e){} },',
    '  setMuted:function(m){ S.sound=!m; try{ SFX.setVolume(m?0:shellVol()); }catch(e){} renderSet(); },',
    '  setSettings:function(st){ applyShellSettings(st); },',
    '  destroy:function(){ try{ if(window.__shellHideBanner) window.__shellHideBanner(); }catch(e){} }',
    '};',
    '',
    'applyShellSettings();',
    'resize();',
    'showIntro();',
    'refreshUI();'),
  'boot settings + Game contract');

fs.writeFileSync(OUT, s);
console.log('\nwrote ' + OUT + '  (' + applied.length + ' patches)');
