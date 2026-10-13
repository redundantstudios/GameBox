'use strict';
const fs = require('fs');
const path = require('path');
const OUT = path.join('app/src/main/assets/games/mimic', 'index.html');
let s = fs.readFileSync(OUT, 'utf8');
const EOL = s.includes('\r\n') ? '\r\n' : '\n';
const lines = s.split(/\r?\n/);

const i = lines.findIndex(l => /^\s*settings:settings,\s*$/.test(l));
if (i < 0) { console.log('MISS settings:settings'); process.exit(1); }

lines.splice(i, 1,
  '    /* The shell owns sound/haptics. Its query string wins at boot, and',
  '       Game.setSettings keeps it live afterwards. Volume arrives on a 0-100',
  '       scale from the shell and is stored here as 0-1. */',
  '    settings:settings,',
  '    ads:{ rewarded:function(placement,onReward){',
  '      var b=bridge(); if(!b) return;',
  '      /* THREE arguments: showRewardedAd(callback, placement, kind). Passing only',
  '         the callback meant the bridge found nothing to call, so a watched ad',
  '         paid out nothing at all. Each request also gets its OWN name - one',
  "         shared global was how two overlapping requests overwrote each other. */",
  "      var n='__studioAdCb'+(++adSeq);",
  "      window[n]=function(result){ try{delete window[n]}catch(e){}",
  "        if(result==='granted'||result===true) onReward(); };",
  "      try{ b.showRewardedAd(n,placement||'mimic.continue','REVIVE'); }catch(e){}",
  '    } }');

fs.writeFileSync(OUT, lines.join(EOL));
console.log('OK   shell settings + rewarded arity');