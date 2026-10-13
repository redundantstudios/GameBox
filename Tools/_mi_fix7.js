'use strict';
const fs = require('fs');
const path = require('path');
const F = path.join('app', 'src', 'main', 'assets', 'games', 'mimic', 'index.html');
const NL = fs.readFileSync(F, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(F, 'utf8').split(NL);

/* The previous splice removed one line too few, leaving the old "}" that closed
   if(cl){ orphaned, plus the now-stale comment above it. Drop both. */
{
  const c = lines.findIndex(l => /Stage word in the relay modes/.test(l || ''));
  if (c >= 0) { lines.splice(c, 1); console.log('OK   stale comment removed'); }
  else console.log('MISS stale comment');

  const d = lines.findIndex(l => /const ci=centreInfo\(p\);/.test(l || ''));
  if (d < 0) { console.log('MISS ci'); process.exit(1); }
  // find the "}" that closes if(ci){ and the orphan right after it
  let close = d;
  while (close < lines.length && lines[close].trim() !== '}') close++;
  if (lines[close + 1] !== undefined && lines[close + 1].trim() === '}') {
    lines.splice(close + 1, 1);
    console.log('OK   orphan brace removed');
  } else console.log('MISS orphan brace');
}

fs.writeFileSync(F, lines.join(NL));
const out = fs.readFileSync(F, 'utf8');
const i = out.indexOf('const ci=centreInfo');
console.log('\nresult:\n' + out.slice(i - 200, i + 320));