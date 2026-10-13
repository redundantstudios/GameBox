'use strict';
const fs = require('fs');
const path = require('path');
const F = path.join('app', 'src', 'main', 'assets', 'games', 'mimic', 'index.html');
const before = fs.readFileSync(F, 'utf8');
const NL = before.includes('\r\n') ? '\r\n' : '\n';
const lines = before.split(NL);
console.log('before: ' + lines.length + ' lines');

/* ---------- FIX 4 (do the crash first): SFX does not exist in this game ----------
   A previous pass added SFX.tap() to two back-button handlers. MIMIC has no SFX
   object at all - its audio is tapN()/clayTone()/toneAt() under CFG.audio - so
   both handlers threw "SFX is not defined" and aborted mid-handler, leaving the
   mode popup stuck. uiTick() already plays the click, so just drop the call. */
{
  let n = 0;
  for (let k = 0; k < lines.length; k++) {
    if (/SFX\.tap\(\);/.test(lines[k])) {
      lines[k] = lines[k].replace(/SFX\.tap\(\);\s*/, '');
      n++;
    }
  }
  console.log('OK   removed SFX.tap() at ' + n + ' site(s)');
}

/* ---------- FIX 1: ADD A TILE must clear the bottom seat circle ----------
   The seats sit on a ring of radius R around cy, so the lowest one is centred
   at cy+R and its edge reaches cy+R+RP. The pill was placed at cy+MR*2.35,
   which on a normal phone lands inside that bottom circle - hence "it is coming
   on the bottom circle". Measure from the real bottom of the board instead, and
   clamp so a short screen cannot push the pill off the edge. */
{
  const i = lines.findIndex(l => l.indexOf('const py=cy+MR*2.35;') >= 0);
  if (i < 0) { console.log('MISS py'); process.exit(1); }
  lines.splice(i, 1,
    '  /* Below the BOARD, clear of the bottom seat circle. The seats sit on a ring',
    '     of radius R, so the lowest one is centred at cy+R and its edge reaches',
    '     cy+R+RP. Placing the pill at cy+MR*2.35 dropped it inside that circle.',
    '     Clamped as well, so a short screen cannot push it off the bottom. */',
    '  const ph0=38;',
    '  let py=cy+R+RP+20+ph0/2;',
    '  py=Math.min(py,H-safe.b-ph0/2-8);');
  console.log('OK   ADD A TILE now sits below the bottom seat circle');

  const j = lines.findIndex(l => l.indexOf('const pw=tw+40, ph=38, r=ph/2;') >= 0);
  if (j < 0) { console.log('MISS ph'); process.exit(1); }
  lines[j] = '  const pw=tw+40, ph=ph0, r=ph/2;';
}

/* ---------- FIX 2: louder ----------
   UI ticks were firing at 0.08-0.30 into a 0.95 master, so everything sat low.
   One boost constant applied to the peak gain of each of the three tone
   helpers, clamped below 1 so stacked voices cannot clip. */
{
  const i = lines.findIndex(l => /^const CFG\s*=\s*\{/.test(l || ''));
  if (i < 0) { console.log('MISS CFG'); process.exit(1); }
  lines.splice(i + 1, 0,
    '/* Overall loudness for the three tone helpers below. They were writing peaks',
    ' * of 0.08-0.30 into a 0.95 master, which is why the game felt quiet. One',
    ' * knob rather than editing every call site; clamped so layered voices',
    ' * cannot clip the output. */',
    'const SND_BOOST=1.45;');
  console.log('OK   SND_BOOST constant added');

  const subs = [
    ['g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+(dur||0.035));',
     'g.gain.setValueAtTime(Math.min(0.95,vol*SND_BOOST),t); g.gain.exponentialRampToValueAtTime(0.0001,t+(dur||0.035));',
     'tapN'],
    ['env.gain.exponentialRampToValueAtTime(Math.max(0.001,vol), t+CFG.audio.attackMs/1000);',
     'env.gain.exponentialRampToValueAtTime(Math.min(0.95,vol*SND_BOOST), t+CFG.audio.attackMs/1000);',
     'clayTone'],
    ['g.gain.exponentialRampToValueAtTime(vol,t+0.008);',
     'g.gain.exponentialRampToValueAtTime(Math.min(0.95,vol*SND_BOOST),t+0.008);',
     'toneAt'],
  ];
  for (const [a, b, label] of subs) {
    const k = lines.findIndex(l => l.indexOf(a) >= 0);
    if (k < 0) { console.log('MISS ' + label); continue; }
    lines[k] = lines[k].replace(a, b);
    console.log('OK   boost applied to ' + label);
  }
}

/* ---------- FIX 3: a back icon that reads, not a filled triangle ----------
   The button face is already the same clayCircleBtn(CREAM, C_DARK) the settings
   gear uses, so the styling is right and only the glyph was wrong. The old mark
   was a thick double-stroked chevron that filled in into a solid wedge. Replaced
   with a proper arrow - a shaft plus an open head - at a single weight, so it
   reads as "back" instead of a triangle. */
{
  const start = lines.findIndex(l => l.indexOf('function backBtn(g){') >= 0);
  if (start < 0) { console.log('MISS backBtn'); process.exit(1); }
  let end = start;
  while (end < lines.length && lines[end].trim() !== '}') end++;
  lines.splice(start, end - start + 1,
    'function backBtn(g){',
    "  /* Same clay face as the settings gear (clayCircleBtn, CREAM on C_DARK),",
    "   * only without its idle rotation. The glyph used to be a thick",
    '   * double-stroked chevron which filled in into a solid wedge and read as a',
    "   * triangle; this is a shaft plus an open head at one weight. */",
    "  clayCircleBtn(g.back.x,g.back.y,g.back.r,CREAM,C_DARK,'back',function(x,y){",
    '    ctx.save();',
    '    ctx.strokeStyle=DARK;',
    '    ctx.lineWidth=Math.max(2.6,g.back.r*0.135);',
    "    ctx.lineCap='round'; ctx.lineJoin='round';",
    '    const s=g.back.r*0.30, h=g.back.r*0.42;',
    '    /* shaft */',
    '    ctx.beginPath(); ctx.moveTo(x-s*1.5,y); ctx.lineTo(x+s*0.35,y); ctx.stroke();',
    '    /* open head */',
    '    ctx.beginPath(); ctx.moveTo(x-s*0.35,y-h); ctx.lineTo(x+s*0.75,y); ctx.lineTo(x-s*0.35,y+h); ctx.stroke();',
    '    ctx.restore();',
    '  });',
    '}');
  console.log('OK   back button glyph replaced with a proper arrow');
}

fs.writeFileSync(F, lines.join(NL));
const out = fs.readFileSync(F, 'utf8');
console.log('after:  ' + fs.readFileSync(F, 'utf8').split(NL).length + ' lines');
console.log('\nchecks:');
console.log('  no SFX refs   :', !/SFX\./.test(out));
console.log('  below board   :', /let py=cy\+R\+RP\+20\+ph0\/2;/.test(out));
console.log('  boost const   :', /const SND_BOOST=1\.45;/.test(out));
console.log('  boost applied :', (out.match(/\*SND_BOOST/g) || []).length === 3);
console.log('  arrow glyph   :', /shaft/.test(out) && /open head/.test(out));