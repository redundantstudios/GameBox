'use strict';
const fs = require('fs');
const path = require('path');
const F = path.join('app', 'src', 'main', 'assets', 'games', 'carroms', 'index.html');
const before = fs.readFileSync(F, 'utf8');
const NL = before.includes('\r\n') ? '\r\n' : '\n';
const lines = before.split(NL);
console.log('before: ' + lines.length + ' lines');

/* ---------- FIX 1: actually build the audio graph at boot ----------
   The comment above familyGameOver()'s call claimed the graph was built "on
   load, not on the first tap". It was not - that call lives inside the
   game-over function. The only other call sits in the pointerdown listener, so
   Carroms played no music at all until the player touched the screen, and the
   dead call made the code look like it was already handled. */
{
  const loadAt = lines.findIndex(l => l.includes('loadState();'));
  if (loadAt < 0) { console.log('MISS loadState'); process.exit(1); }
  let i = -1;
  for (let k = loadAt; k < lines.length; k++) if (lines[k].trim() === 'resizeAll();') i = k;
  if (i < 0) { console.log('MISS boot anchor'); process.exit(1); }
  lines.splice(i + 1, 0,
    '',
    '/* BGM starts with the game, not with the first tap. The only audioEnsure()',
    '   on this path used to sit inside familyGameOver(), so the graph was never',
    "   built until a game had finished - Carroms had no music in normal play at",
    '   all. Placed after loadState() so a saved music toggle is still honoured. */',
    'audioEnsure();');
  console.log('OK   boot-time audioEnsure() added after resizeAll()');
}

/* ---------- FIX 2: recover a context the WebView refuses to resume ----------
   mediaPlaybackRequiresUserGesture=false lets a context created before any
   gesture start SUSPENDED, and some WebViews then refuse to resume it. After
   the player has touched the screen, rebuild it instead: a context created
   during a real gesture runs. Guarded so it retries at most every 1.5s rather
   than thrashing on every pointerdown. */
{
  const i = lines.findIndex(l => l.indexOf("if(A.ctx){if(A.ctx.state==='suspended')A.ctx.resume();return}") >= 0);
  if (i < 0) { console.log('MISS re-entry'); process.exit(1); }
  lines.splice(i, 1,
    'if(A.ctx){',
    "  if(A.ctx.state==='suspended'){",
    '    try{ A.ctx.resume(); }catch(e){}',
    '    /* A context built before any gesture can stay stuck in ' + "'suspended'" + ' and refuse to',
    "     * resume. Once the player has touched the screen, rebuild it - one made",
    '     * during a real gesture runs. Only after a failed attempt, and at most',
    '     * every 1.5s, so a pointerdown cannot thrash this. */',
    "    const now=Date.now();",
    '    if(A.gesture && A.resumeT && now-A.resumeT>1500){ audioRebuild(); return; }',
    '    if(!A.resumeT)A.resumeT=now;',
    '  }',
    '  return',
    '}');
  console.log('OK   re-entry guard now rebuilds a stuck context');

  // audioRebuild, declared before audioEnsure uses it
  const d = lines.findIndex(l => l.indexOf('function audioEnsure(){') >= 0);
  lines.splice(d, 0,
    '/* Tear the graph down so audioEnsure() can build it again. Used only when a',
    '   context will not resume after a real gesture. */',
    'function audioRebuild(){',
    '  try{ if(Music&&Music.stop)Music.stop(); }catch(e){}',
    '  try{ if(A.ctx)A.ctx.close(); }catch(e){}',
    '  A.ctx=null; A.musicG=null; A.sfxG=null; A.noiseBuf=null; A.resumeT=0;',
    '  audioEnsure();',
    '}');
  console.log('OK   audioRebuild() helper');
}

/* ---------- record that a real gesture happened ---------- */
{
  let n = 0;
  for (let k = 0; k < lines.length; k++) {
    if (lines[k].trim() === 'audioEnsure();') {
      lines.splice(k, 0, 'A.gesture=true;   /* a real touch: the context may be rebuilt now */');
      k++;                 // skip the line we just pushed, or we match it forever
      n++;
    }
  }
  console.log('OK   gesture flag set at ' + n + ' call site(s)');
}

const after = lines.join(NL);
fs.writeFileSync(F, after);
console.log('after:  ' + fs.readFileSync(F, 'utf8').split(NL).length + ' lines');

const out = fs.readFileSync(F, 'utf8');
console.log('\nchecks:');
console.log('  boot init      :', /BEMPLACEHOLDER/.test(out));
console.log('  rebuild helper :', /function audioRebuild\(\)/.test(out));
console.log('  gesture flag   :', /A\.gesture=true;/.test(out));
console.log('  survived len   :', out.length > before.length - 200);