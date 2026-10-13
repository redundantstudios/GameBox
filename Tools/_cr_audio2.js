'use strict';
const fs = require('fs');
const path = require('path');
const F = path.join('app', 'src', 'main', 'assets', 'games', 'carroms', 'index.html');
let s = fs.readFileSync(F, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
const lines = s.split(NL);

const i = lines.findIndex(l => l.indexOf('  A.ctx=new AC();') >= 0);
if (i < 0) { console.log('MISS'); process.exit(1); }
if (lines[i - 1].indexOf('const AC=') < 0) {
  lines.splice(i, 0,
    '  /* Re-entry: resume and bail if the graph already exists. */',
    "  if(A.ctx){if(A.ctx.state==='suspended')A.ctx.resume();return}",
    '  const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return;');
  console.log('OK   restored the re-entry guard and the AC lookup');
} else console.log('     already intact');

fs.writeFileSync(F, lines.join(NL));
const out = fs.readFileSync(F, 'utf8');
console.log('  AC defined  :', /const AC=window\.AudioContext/.test(out));
console.log('  guard back  :', /if\(A\.ctx\)\{if\(A\.ctx\.state==='suspended'\)A\.ctx\.resume\(\);return\}/.test(out));
console.log('  no recursion:', !/try\{ audioEnsure\(\); \}catch\(e\)\{\}/.test(out));