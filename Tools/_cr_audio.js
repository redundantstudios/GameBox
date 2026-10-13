'use strict';
const fs = require('fs');
const path = require('path');
const F = path.join('app', 'src', 'main', 'assets', 'games', 'carroms', 'index.html');
let s = fs.readFileSync(F, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
const lines = s.split(NL);

/* 1. Delete the self-recursive call. With A.ctx null it called audioEnsure()
      again, which called it again, until the stack blew - the try/catch caught the
      RangeError but line 495 was never reached, so the graph was NEVER created and
      the BGM could not play at all. The "AudioTrack: installed" seen in logcat was
      the shell's own music, not this game's. */
{
  const i = lines.findIndex(l => l.indexOf('if(!A.ctx||A.ctx.state!=="running"){ try{ audioEnsure(); }catch(e){} }') >= 0);
  if (i < 0) { console.log('MISS recursive call'); process.exit(1); }
  lines.splice(i, 3);   /* the recursive line, the comment opener and 2 comment lines */
  console.log('OK   removed the self-recursive audioEnsure call');
}

/* 2. Resume a context that is created suspended. A freshly constructed
      AudioContext starts suspended until a gesture on the page, and the boot
      call happens before any touch. */
{
  const i = lines.findIndex(l => l.indexOf('  A.ctx=new AC();') >= 0);
  if (i < 0) { console.log('MISS ctx creation'); process.exit(1); }
  lines.splice(i + 1, 0,
    '  /* A context created before any gesture starts SUSPENDED even with the',
    "     shell's mediaPlaybackRequiresUserGesture=false, so ask it to run now and",
    '     again on the first touch (the pointerdown listener below). */',
    "  if(A.ctx.state==='suspended'&&A.ctx.resume){ try{ A.ctx.resume(); }catch(e){} }");
  console.log('OK   resume the context right after creating it');
}

fs.writeFileSync(F, lines.join(NL));
const out = fs.readFileSync(F, 'utf8');
console.log('  no recursion :', !/try\{ audioEnsure\(\); \}catch\(e\)\{\}/.test(out));
console.log('  resumes      :', /if\(A\.ctx\.state==='suspended'&&A\.ctx\.resume\)/.test(out));