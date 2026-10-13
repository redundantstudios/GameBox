'use strict';
const fs = require('fs');
const path = require('path');

/* ================= MIMIC ================= */
{
  const f = 'app/src/main/assets/games/mimic/index.html';
  let s = fs.readFileSync(f, 'utf8');
  const swap = (from, to, label) => {
    if (!s.includes(from)) { console.log('MISS mimic: ' + label); return; }
    s = s.split(from).join(to); console.log('OK   mimic: ' + label);
  };

  /* ---- 1. THE SOUNDS. Two separate causes. ----
     (a) The settings bootstrap never landed - only its comment did - so
         settings.sound came from a 'shell:settings' blob that may not exist.
         With sound false, effMuted() is true and EVERY sound is suppressed.
     (b) The AudioContext was only ever created on the first pointerdown, so
         nothing could be heard until the player touched the board. */
  swap('    settings:settings,\n    ads:{ rewarded:function(placement,onReward){',
    '    settings:settings,\n' +
    '    /* The shell owns sound/haptics and is the source of truth. Its query\n' +
    '       string is applied HERE, at Studio construction, so effMuted() can\n' +
    "       never read a stale blob and silence the whole game. */\n" +
    '    (function(){\n' +
    '      function q(k){ try{ var m=location.search.match(new RegExp("[?&]"+k+"=([^&]*)"));\n' +
    '        return m?decodeURIComponent(m[1]):null; }catch(e){ return null; } }\n' +
    '      var sv=q("sound"), vb=q("vibe"), vl=q("vol");\n' +
    '      if(sv!=null) settings.sound=(sv==="1");\n' +
    '      if(vb!=null) settings.haptics=(vb==="1");\n' +
    '      if(settings.volume==null) settings.volume=1;\n' +
    '      if(vl!=null){ var n=parseFloat(vl); if(!isNaN(n)) settings.volume=Math.max(0,Math.min(1,n>1?n/100:n)); }\n' +
    '    })();\n' +
    '    ads:{ rewarded:function(placement,onReward){',
    'settings bootstrap');

  /* Build the audio graph at boot rather than on the first tap. */
  swap('  relayout();\n  lastT=performance.now();',
    '  /* Build the audio graph now, not on the first tap. The shell lifts\n' +
    '     Chromium\'s autoplay gesture gate, so this can actually produce sound -\n' +
    '     leaving it to the first pointerdown meant a silent opening. */\n' +
    '  try{ ensureAudio(); applyMaster(); }catch(e){}\n' +
    '  relayout();\n  lastT=performance.now();',
    'audio graph at boot');

  /* ---- 2. THE ORIGINAL FONT ----
     FONT asked for "Baloo 2" first but nothing ever loaded it, so every string
     fell through to Comic Sans / ui-rounded. The weights ship in the assets. */
  if (!/@font-face/.test(s)) {
    s = s.replace('<style>',
      '<style>\n' +
      "  @font-face{font-family:'Baloo2';src:url('../../fonts/web/Baloo2-800.ttf') format('truetype');font-weight:800;font-display:swap}\n" +
      "  @font-face{font-family:'Baloo2';src:url('../../fonts/web/Baloo2-700.ttf') format('truetype');font-weight:700;font-display:swap}\n" +
      "  @font-face{font-family:'Baloo2';src:url('../../fonts/web/CormorantGaramond-700.ttf') format('truetype');font-weight:400;font-display:swap}",
      true);
    console.log('OK   mimic: @font-face');
  }
  swap(
    "const FONT='\"Baloo 2\",\"Comic Sans MS\",\"Chalkboard SE\",\"Comic Neue\",ui-rounded,\"Trebuchet MS\",sans-serif';",
    "const FONT='Baloo2,\"Baloo 2\",\"Comic Sans MS\",\"Chalkboard SE\",\"Comic Neue\",ui-rounded,\"Trebuchet MS\",sans-serif';\n" +
    '  /* Loaded explicitly at boot so the first frame is already in the real\n' +
    '     face; without this the first paint lands in the fallback and the swap\n' +
    '     reads as a font glitch mid-game. */\n' +
    "  (function(){ try{ if(document.fonts&&document.fonts.load){\n" +
    "    document.fonts.load(\"800 16px Baloo2\"); document.fonts.load(\"700 16px Baloo2\"); } }catch(e){} })();",
    'FONT uses loaded face');

  fs.writeFileSync(f, s);
}

/* ================= CHINESE CHECKERS ================= */
{
  const f = 'app/src/main/assets/games/chinese-checkers/index.html';
  let s = fs.readFileSync(f, 'utf8');
  const swap = (from, to, label) => {
    if (!s.includes(from)) { console.log('MISS cc: ' + label); return; }
    s = s.split(from).join(to); console.log('OK   cc: ' + label);
  };

  /* ---- BANNER STILL WRONG ON THE START PAGE ----
     The fallback `window.__ccSyncBanner = function(){}` was installed BEFORE
     the real syncBanner had ever run, so at DOMContentLoaded the game called
     the NO-OP: the strip was never told to hide, and it sat on the start page
     until a tap happened to drive the real one. Export the real function as
     soon as it is defined, and drop the no-op shim entirely. */
  swap('if(!window.__ccSyncBanner)window.__ccSyncBanner=function(){};\n  window.Game={', 'window.Game={',
    'no-op fallback removed');
  swap(
    '  function syncBanner(){\n' +
    '  /* Exported because the game\'s own screen changes live OUTSIDE this IIFE.\n' +
    '     Inside it they could not see this function at all. */\n' +
    '  window.__ccSyncBanner=syncBanner;',
    '  function syncBanner(){',
    'export removed from body');
  swap(
    '  function currentScreenIsGame(){',
    '  /* Exported at DEFINITION time, not on first call. A no-op fallback was\n' +
    '     standing in for it until then, and the boot-time call was hitting the\n' +
    '     no-op - so the strip was never told to hide on the start page. */\n' +
    '  window.__ccSyncBanner=syncBanner;\n' +
    '  function currentScreenIsGame(){',
    'export at definition');

  /* ---- MORE VOLUME ---- */
  swap('const SFX_MAKEUP=1.7, MUS_MAKEUP=2.6;', 'const SFX_MAKEUP=2.1, MUS_MAKEUP=3.2;',
    'makeup raised');

  fs.writeFileSync(f, s);
}

const chk = fs.readFileSync('app/src/main/assets/games/chinese-checkers/index.html', 'utf8');
console.log('\ncc checks:');
console.log('  export at definition :', /window\.__ccSyncBanner=syncBanner;\s*\n\s*function currentScreenIsGame/.test(chk));
console.log('  no no-op shim        :', !/__ccSyncBanner=function\(\)\{\}/.test(chk));
console.log('  makeup raised        :', /SFX_MAKEUP=2\.1/.test(chk));