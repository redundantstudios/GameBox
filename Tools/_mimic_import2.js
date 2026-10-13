'use strict';
const fs = require('fs');
const path = require('path');
const SRC = 'sources/Playable Games/Mimic.html';
const OUT = path.join('app/src/main/assets/games/mimic', 'index.html');
let s = fs.readFileSync(SRC, 'utf8');

const EOL = s.includes('\r\n') ? '\r\n' : '\n';
const lines = s.split(/\r?\n/);

function findIdx(re, from = 0) {
  for (let i = from; i < lines.length; i++) if (re.test(lines[i])) return i;
  return -1;
}
function replaceBlock(startRe, count, newLines, label) {
  const i = findIdx(startRe);
  if (i < 0) { console.log('MISS ' + label); return; }
  lines.splice(i, count, ...newLines);
  console.log('OK   ' + label);
}

/* ---------- 1. the ad bridge ----------
   Every ad went through `b[kind]()` with ZERO arguments. The shell matches by
   EXACT arity, so every interstitial - and both banner calls - silently did
   nothing. Rewritten to the real signatures. */
replaceBlock(/^function tryNativeAd\(kind\)\{/, 6, [
  'var adSeq=0;',
  'function studioInterstitial(placement){',
  '  try{',
  '    var b=window.NativeBridge;',
  '    if(!b||!b.showInterstitial)return;',
  "    var n='__studioInterCb'+(++adSeq);",
  '    window[n]=function(){try{delete window[n]}catch(e){}};',
  "    b.showInterstitial(n,placement||'mimic');",
  '  }catch(e){}',
  '}',
  'function tryNativeAd(kind){',
  '  try{',
  '    var b=window.NativeBridge;',
  '    if(!b)return;',
  "    if(kind==='showInterstitialAd'){studioInterstitial('mimic.break');return}",
  "    if(kind==='showBannerAd'){if(b.showBanner)b.showBanner();return}",
  "    if(kind==='hideBannerAd'){if(b.hideBanner)b.hideBanner();return}",
  '  }catch(e){}',
  '}',
], 'ad bridge arity');

/* ---------- 2. rewarded: was called with one argument ---------- */
{
  const i = findIdx(/window\.__studioAdCb=function\(result\)/);
  if (i < 0) { console.log('MISS rewarded'); }
  else {
    // replace the three lines from __studioAdCb through showRewardedAd
    let j = i;
    while (!/showRewardedAd\(/.test(lines[j]) && j < lines.length) j++;
    lines.splice(i, j - i + 1,
      '  /* THREE arguments: showRewardedAd(callback, placement, kind). Passing only',
      '     the callback meant the bridge found nothing to call, so a watched ad',
      '     paid out nothing at all. Each request also gets its OWN name - one',
      "     shared global was how two overlapping requests overwrote each other. */",
      "  var n='__studioAdCb'+(++adSeq);",
      "  window[n]=function(result){ try{delete window[n]}catch(e){}",
      "    if(result==='granted'||result===true) onReward(); };",
      "  try{ b.showRewardedAd(n,placement||'mimic.continue','REVIVE'); }catch(e){}");
    console.log('OK   rewarded arity');
  }
}

/* ---------- 3. shell settings win at boot ----------
   Studio.settings was built from a stored blob, so the shell's sound/haptics
   choices could disagree with the game's. */
{
  const i = findIdx(/window\.Studio=settings,ads:/);
  if (i < 0) { console.log('MISS settings'); }
  else {
    lines.splice(i, 1,
      '  /* The shell owns sound/haptics. Its query string wins at boot, and',
      '     Game.setSettings keeps it live afterwards. Volume arrives on a 0-100',
      '     scale from the shell and is stored 0-1. */',
      '  (function(){',
      '    function q(k){ try{ var m=location.search.match(new RegExp("[?&]"+k+"=([^&]*)"));',
      '      return m?decodeURIComponent(m[1]):null; }catch(e){ return null; } }',
      '    var sv=q("sound"), vb=q("vibe"), vl=q("vol");',
      '    if(sv!=null) settings.sound=(sv==="1");',
      '    if(vb!=null) settings.haptics=(vb==="1");',
      '    if(vl!=null){ var n=parseFloat(vl); if(!isNaN(n)) settings.volume=Math.max(0,Math.min(1,n>1?n/100:n)); }',
      '  })();',
      '  window.Studio=settings,ads:{');
    console.log('OK   shell settings at boot');
  }
}

/* ---------- 4. the shell's volume has to reach the master gain ---------- */
{
  const i = findIdx(/function applyMaster\(\)\{/);
  if (i < 0) { console.log('MISS applyMaster'); }
  else {
    lines.splice(i, 1,
      'function applyMaster(){ if(master) master.gain.value = effMuted()?0:CFG.audio.master*(settings.volume==null?1:settings.volume); }');
    console.log('OK   master honours shell volume');
  }
}

/* ---------- 5. Game.setSettings, so changes are live ---------- */
{
  const i = findIdx(/^window\.Game=\{/);
  if (i < 0) { console.log('MISS Game obj'); }
  else {
    lines.splice(i + 1, 0,
      '  setSettings:function(st){ try{',
      '    if(!st)return;',
      '    if(typeof st.sound==="boolean") settings.sound=st.sound;',
      '    if(typeof st.music==="boolean"&&typeof st.music==="boolean"){/* music follows sound */}',
      '    if(typeof st.haptics==="boolean") settings.haptics=st.haptics;',
      '    if(typeof st.volume==="number") settings.volume=Math.max(0,Math.min(1,st.volume>1?st.volume/100:st.volume));',
      '    applyMaster();',
      '  }catch(e){} },');
    console.log('OK   setSettings');
  }
}

/* ---------- 6. title back + helpers ---------- */
{
  const i = findIdx(/if\(screen==='title'\)\{ titleHit\(x,y\); return; \}/);
  if (i < 0) { console.log('MISS title back'); }
  else {
    lines.splice(i, 1,
      "  if(screen==='title'){",
      '    /* Back to the shell. The title is canvas-only, so this is a drawn',
      '       hit-box rather than a DOM button. */',
      '    var tb=titleBackGeom();',
      '    if(inR(tb,x,y)){ uiTick(); tryNativeExit(); return; }',
      '    titleHit(x,y); return;',
      '  }');
    console.log('OK   title back');
  }
  const j = findIdx(/^function relayout\(\)\{/);
  if (j < 0) { console.log('MISS helpers'); }
  else {
    lines.splice(j, 0,
      'function titleBackGeom(){ return {x:14,y:(safe.t||0)+10,w:42,h:42}; }',
      'function tryNativeExit(){ try{ var b=window.NativeBridge; if(b&&b.exitGame)b.exitGame(); }catch(e){} }');
    console.log('OK   title helpers');
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, lines.join(EOL));
console.log('written:', OUT, lines.join(EOL).length, 'bytes');