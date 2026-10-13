'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/mimic/index.html';
const EOL = fs.readFileSync(f, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);

// 1. drop the IIFE and its comment from inside the object literal
let a = lines.findIndex(l => l.includes('The shell owns sound/haptics and is the source of truth'));
let b = lines.findIndex(l => l.trim() === '})();');
if (a > 0 && b > a) { lines.splice(a, b - a + 1); console.log('OK   removed IIFE from object literal'); }
else console.log('MISS removal');

// 2. drop the older duplicate comment
a = lines.findIndex(l => l.includes('The shell owns sound/haptics. Its query string wins at boot'));
b = lines.findIndex((l, i) => i > a && l.includes('scale from the shell and is stored here as 0-1. */'));
if (a > 0 && b > a) { lines.splice(a, b - a + 1); console.log('OK   removed duplicate comment'); }

// 3. run the bootstrap BEFORE the object is built, where a statement is legal
const r = lines.findIndex(l => l.trim() === 'return {');
if (r < 0) { console.log('MISS return'); process.exit(1); }
lines.splice(r, 0,
  '  /* The shell owns sound/haptics and is the source of truth. Applied here,',
  '     before Studio is built, so effMuted() can never read a stale blob and',
  '     silence the entire game. Volume arrives on a 0-100 scale. */',
  '  (function(){',
  '    function q(k){ try{ var m=location.search.match(new RegExp("[?&]"+k+"=([^&]*)"));',
  '      return m?decodeURIComponent(m[1]):null; }catch(e){ return null; } }',
  '    var sv=q("sound"), vb=q("vibe"), vl=q("vol");',
  '    if(sv!=null) settings.sound=(sv==="1");',
  '    if(vb!=null) settings.haptics=(vb==="1");',
  '    if(settings.volume==null) settings.volume=1;',
  '    if(vl!=null){ var n=parseFloat(vl); if(!isNaN(n)) settings.volume=Math.max(0,Math.min(1,n>1?n/100:n)); }',
  '  })();');
console.log('OK   bootstrap moved before return');

fs.writeFileSync(f, lines.join(EOL));