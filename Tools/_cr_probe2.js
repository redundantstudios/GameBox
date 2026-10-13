'use strict';
const fs = require('fs');
const path = require('path');
const F = path.join('app', 'src', 'main', 'assets', 'games', 'carroms', 'index.html');
let s = fs.readFileSync(F, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
let lines = s.split(NL);

// strip the previously misplaced probe
lines = lines.filter(l => l.indexOf('/*__CARROM_AUDIO_PROBE__*/') < 0 && l.indexOf('[CARROMAUDIO]') < 0 && !/^\s*\},?\d00\);?\s*$/.test(l) === false || true);
// remove its helper blocks precisely
{
  const keep = [];
  for (let i = 0; i < lines.length; i++) {
    if (/\[CARROMAUDIO\]/.test(lines[i])) {
      while (i < lines.length && !/^\},?\d00\);?$/.test(lines[i] || '')) i++;
      continue;
    }
    keep.push(lines[i]);
  }
  lines = keep;
}

const MARK = '/*__CARROM_AUDIO_PROBE__*/';
// the top-level boot call: the audioEnsure() that is NOT inside a listener
let target = -1;
for (let k = lines.length - 1; k >= 0; k--) {
  if (lines[k].trim() === 'audioEnsure();') { target = k; break; }
}
if (target < 0) { console.log('MISS boot audioEnsure'); process.exit(1); }
console.log('    anchoring at line ' + (target + 1) + ': ' + lines[target].trim());

lines.splice(target + 1, 0,
  MARK,
  "console.log('[CARROMAUDIO] boot: AC='+(typeof AudioContext)+' music='+(typeof state!=='undefined'?state.music:'?')+' ctx='+(A&&A.ctx?A.ctx.state:'null'));",
  "setTimeout(function(){",
  "  var st=(A&&A.ctx)?A.ctx.state:'null';",
  "  console.log('[CARROMAUDIO] t600 ctx='+st+' playing='+(typeof Music!=='undefined'?Music.playing:'?')+' iv='+(typeof Music!=='undefined'&&Music.iv?'set':'null'));",
  "  if(st==='suspended'){ var p=A.ctx.resume(); if(p&&p.then)p.then(function(){console.log('[CARROMAUDIO] resume OK -> '+A.ctx.state);},function(er){console.log('[CARROMAUDIO] resume REJECTED: '+er);}); }",
  "},600);",
  "setTimeout(function(){",
  "  console.log('[CARROMAUDIO] t3000 ctx='+(A&&A.ctx?A.ctx.state:'null')+' playing='+(typeof Music!=='undefined'?Music.playing:'?'));",
  "},3000);");

fs.writeFileSync(F, lines.join(NL));
const out = fs.readFileSync(F, 'utf8');
console.log('OK   probe anchored at the top-level boot call');
console.log('  count:', (out.match(/\[CARROMAUDIO\]/g) || []).length);