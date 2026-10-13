'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/mimic/index.html';
let s = fs.readFileSync(f, 'utf8');

const swap = (from, to, label) => {
  const re = from instanceof RegExp ? from : new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  if (!re.test(s)) { console.log('MISS ' + label); return; }
  s = s.replace(re, to);
  console.log('OK   ' + label);
};

/* Report WHY the graph fails to build. Every step is logged, because the only
   symptom was "no sound" - a throw anywhere in here left actx null and the
   whole game silent, silently. */
swap(
  /const AC=window\.AudioContext\|\|window\.webkitAudioContext; if\(!AC\) return;\r?\n\s*actx=new AC\(\);/,
  'const AC=window.AudioContext||window.webkitAudioContext;\n' +
  '    if(!AC){ try{ console.log(\'[mimic] no AudioContext constructor\'); }catch(e){} return; }\n' +
  '    try{ actx=new AC(); }\n' +
  '    catch(err){ try{ console.log(\'[mimic] new AudioContext FAILED: \'+err); }catch(e){} actx=null; return; }',
  'ctor reporting');

swap(
  /\}catch\(e\)\{ actx=null; \}/,
  '}catch(e){ try{ console.log(\'[mimic] audio build failed: \'+e); }catch(_){} actx=null; }',
  'build reporting');

/* ---- the title draw error ----
   `rr()` was being handed a negative radius, which throws a DOMException and
   aborts the rest of drawTitle. Guard the helper itself so no call site can take
   the whole title screen down again. */
swap(
  /function rr\(x,y,w,h,r\)\{ r=Math\.min\(r,w\/2,h\/2\);/,
  'function rr(x,y,w,h,r){\n' +
  '  /* A negative radius throws a DOMException from arcTo, and one bad call\n' +
  '     aborted the whole title draw. Clamped, and a non-finite radius falls back\n' +
  '     to square corners rather than taking the screen with it. */\n' +
  '  if(!(r>=0)) r=0;\n' +
  '  r=Math.max(0,Math.min(r,Math.abs(w)/2,Math.abs(h)/2));',
  'rr radius guarded');

fs.writeFileSync(f, s);
console.log('\nchecks:');
console.log('  ctor reported :', /new AudioContext FAILED/.test(s));
console.log('  build reported :', /audio build failed/.test(s));
console.log('  rr guarded     :', /if\(!\(r>=0\)\) r=0;/.test(s));