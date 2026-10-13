'use strict';
const fs = require('fs');
const path = require('path');
const F = path.join('app', 'src', 'main', 'assets', 'games', 'carroms', 'index.html');
let s = fs.readFileSync(F, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
const lines = s.split(NL);
const MARK = '/*__CARROM_AUDIO_PROBE__*/';
if (s.indexOf(MARK) < 0) {
  const i = lines.findIndex(l => /audioEnsure\(\);?\s*(\/\/.*)?$/.test(l.trim()) && l.indexOf('function') < 0);
  const j = i >= 0 ? i : lines.findIndex(l => l.indexOf('audioEnsure();') >= 0);
  if (j < 0) { console.log('MISS boot call'); process.exit(1); }
  lines.splice(j + 1, 0,
    MARK,
    "console.log('[CARROMAUDIO] boot reached; AC='+(typeof AudioContext)+' state.music='+(typeof state!=='undefined'?state.music:'?')+' ctx='+(A&&A.ctx?A.ctx.state:'null'));",
    "try{ audioEnsure(); }catch(e){ console.log('[CARROMAUDIO] ensure threw: '+e.message); }",
    "setTimeout(function(){",
    "  console.log('[CARROMAUDIO] t500 ctx='+(A&&A.ctx?A.ctx.state:'null')+' music='+(typeof state!=='undefined'?state.music:'?'));",
    "  if(A&&A.ctx&&A.ctx.state==='suspended'){ A.ctx.resume().then(function(){ console.log('[CARROMAUDIO] resumed -> '+A.ctx.state); }, function(er){ console.log('[CARROMAUDIO] resume rejected: '+er); }); }",
    "},500);",
    "setTimeout(function(){",
    "  console.log('[CARROMAUDIO] t2500 ctx='+(A&&A.ctx?A.ctx.state:'null')+' music='+(typeof state!=='undefined'?state.music:'?')+' Music='+(typeof Music!=='undefined'?(Music.playing?'playing':'notplaying'):'?'));",
    "},2500);");
  fs.writeFileSync(F, lines.join(NL));
  console.log('OK   probe added after line ' + (j + 1));
} else console.log('SKIP probe already present');