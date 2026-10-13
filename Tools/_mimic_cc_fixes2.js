'use strict';
const fs = require('fs');

const swap = (s, from, to, label) => {
  const re = from instanceof RegExp ? from : new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  if (!re.test(s)) { console.log('MISS ' + label); return s; }
  s = s.replace(re, to);
  console.log('OK   ' + label);
  return s;
};

/* ---------- MIMIC ---------- */
{
  const f = 'app/src/main/assets/games/mimic/index.html';
  let s = fs.readFileSync(f, 'utf8');

  s = swap(s,
    /    settings:settings,\r?\n    ads:\{ rewarded:function\(placement,onReward\)\{/,
    '    settings:settings,\n' +
    '    /* The shell owns sound/haptics and is the source of truth. Its query\n' +
    '       string is applied HERE, at Studio construction, so effMuted() can\n' +
    "       never read a stale blob and silence the entire game. */\n" +
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
    'mimic: settings bootstrap');

  s = swap(s,
    /  relayout\(\);\r?\n  lastT=performance\.now\(\);/,
    '  /* Build the audio graph at boot, not on the first tap. The shell lifts\n' +
    "     Chromium's autoplay gesture gate, so this can actually make sound -\n" +
    '     leaving it to the first pointerdown meant a silent opening. */\n' +
    '  try{ ensureAudio(); applyMaster(); }catch(e){}\n' +
    '  relayout();\n  lastT=performance.now();',
    'mimic: audio at boot');

  fs.writeFileSync(f, s);
}

/* ---------- CHINESE CHECKERS ---------- */
{
  const f = 'app/src/main/assets/games/chinese-checkers/index.html';
  let s = fs.readFileSync(f, 'utf8');

  s = swap(s,
    /(  function syncBanner\(\)\{\r?\n    var on=onGamePage\(\);\r?\n    if\(on===bOn\)return;\r?\n    bOn=on;\r?\n    banner\(on\);\r?\n  \})/,
    '$1\n' +
    '  /* Exported at DEFINITION time. A no-op fallback used to stand in for it\n' +
    '     until the first call, and the boot-time call was hitting that no-op -\n' +
    '     so the strip was never told to hide and sat on the start page until a\n' +
    '     tap happened to reach the real one. */\n' +
    '  window.__ccSyncBanner=syncBanner;',
    'cc: export at definition');

  fs.writeFileSync(f, s);
}

const cc = fs.readFileSync('app/src/main/assets/games/chinese-checkers/index.html', 'utf8');
const mm = fs.readFileSync('app/src/main/assets/games/mimic/index.html', 'utf8');
console.log('\ncc  export present :', /window\.__ccSyncBanner=syncBanner;/.test(cc));
console.log('cc  no no-op shim  :', !/__ccSyncBanner=function\(\)\{\}/.test(cc));
console.log('mm  bootstrap     :', /if\(settings\.volume==null\) settings\.volume=1;/.test(mm));
console.log('mm  audio at boot :', /try\{ ensureAudio\(\); applyMaster\(\); \}/.test(mm));
console.log('mm  font          :', /@font-face\{font-family:'Baloo2'/.test(mm));