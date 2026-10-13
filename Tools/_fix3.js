'use strict';
const fs = require('fs');
const path = require('path');
const NL = f => fs.readFileSync(f, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const KA = path.join('app', 'src', 'main', 'assets', 'games', 'knot-away', 'index.html');
const MI = path.join('app', 'src', 'main', 'assets', 'games', 'mimic', 'index.html');
const TD = path.join('app', 'src', 'main', 'assets', 'games', 'truth-or-dare', 'index.html');
const rd = f => fs.readFileSync(f, 'utf8').split(NL(f));
const wr = (f, l) => fs.writeFileSync(f, l.join(NL(f)));

/* ================= 1. KNOT AWAY: the ad never fired =================
   rewarded() is declared inside the shell integration IIFE, so it is NOT
   global - calling it from the game block threw ReferenceError and nothing
   happened when the button was pressed. The hint/undo refill already does this
   correctly through window.__shellRewarded with a "knotaway." placement
   prefix; use exactly the same door. */
{
  const lines = rd(KA);
  const i = lines.findIndex(l => /rewarded\('level_unlock', function\(\)\{/.test(l || ''));
  if (i < 0) { console.log('MISS ka rewarded call'); process.exit(1); }
  lines.splice(i, 5,
    "    /* window.__shellRewarded, not the bare name: rewarded() lives inside the",
    '     * shell IIFE and is not in scope here, so the previous call threw and',
    '     * the ad silently never opened. Same "knotaway." placement convention as',
    '     * the hint/undo refill. */',
    "    if(!window.__shellRewarded){ kaToast('AD NOT AVAILABLE'); return; }",
    "    window.__shellRewarded('knotaway.level_unlock', function(){",
    '      grantAdLevel(uaIdx);',
    '      renderLevels();',
    "    }, function(){ kaToast('AD NOT AVAILABLE'); });");
  wr(KA, lines);
  const o = fs.readFileSync(KA, 'utf8');
  console.log('OK   knot-away uses window.__shellRewarded');
  console.log('  guarded :', /if\(!window\.__shellRewarded\)/.test(o));
  console.log('  no bare :', !/^\s*rewarded\('level_unlock'/m.test(o));
}

/* ================= 2. MIMIC: arrow pointed the wrong way =================
   The head's apex sat on the right (x+s*0.8) with the arms opening left, so it
   drew a right-facing arrow on a back button. Mirror it: apex on the left, shaft
   running out to the right. */
{
  const lines = rd(MI);
  const i = lines.findIndex(l => /ctx\.beginPath\(\); ctx\.moveTo\(x-s\*1\.6,y\); ctx\.lineTo\(x\+s\*0\.4,y\); ctx\.stroke\(\);/.test(l || ''));
  const j = lines.findIndex(l => /ctx\.beginPath\(\); ctx\.moveTo\(x-s\*0\.3,y-h\); ctx\.lineTo\(x\+s\*0\.8,y\);/.test(l || ''));
  if (i < 0 || j < 0) { console.log('MISS mimic arrow', i, j); process.exit(1); }
  lines.splice(i, 1,
    '  ctx.beginPath(); ctx.moveTo(x+s*1.5,y); ctx.lineTo(x-s*0.3,y); ctx.stroke();');
  lines.splice(j, 1,
    '  ctx.beginPath(); ctx.moveTo(x+s*0.4,y-h); ctx.lineTo(x-s*0.8,y); ctx.lineTo(x+s*0.4,y+h); ctx.stroke();');
  wr(MI, lines);
  const o = fs.readFileSync(MI, 'utf8');
  console.log('\nOK   mimic arrow mirrored to point left');
  console.log('  apex left :', /lineTo\(x-s\*0\.8,y\)/.test(o));
  console.log('  shaft out :', /moveTo\(x\+s\*1\.5,y\)/.test(o));
  console.log('  no right  :', !/x\+s\*0\.8,y\)/.test(o));
}

/* ================= 3. TRUTH OR DARE: drop MONETIZATION PLANS =================
   Remove the button AND its handler - leaving the handler would dereference a
   null element and throw, killing every binding below it in the same block.
   The plans overlay itself is left in place, just unreachable. */
{
  const lines = rd(TD);
  const b = lines.findIndex(l => /<button class="mini" id="plansBtn"/.test(l || ''));
  if (b < 0) { console.log('MISS plansBtn'); process.exit(1); }
  lines.splice(b, 1);
  console.log('\nOK   plansBtn markup removed');

  const h = lines.findIndex(l => /\$\('#plansBtn'\)\.onclick=/.test(l || ''));
  if (h < 0) { console.log('MISS plansBtn handler'); process.exit(1); }
  lines.splice(h, 1);
  console.log('OK   plansBtn handler removed');

  // tidy the now-empty section banner
  const c = lines.findIndex(l => /PLANS PANEL/.test(l || ''));
  if (c >= 0) {
    lines.splice(c, 1,
      '/* ================= PLANS PANEL =================',
      '   The MONETIZATION PLANS button under PRESS START was removed. The overlay',
      '   stays in the markup, it simply has no way in now. */');
    console.log('OK   plans section noted');
  }
  wr(TD, lines);
  const o = fs.readFileSync(TD, 'utf8');
  console.log('  gone     :', !/plansBtn/.test(o));
  console.log('  overlay  :', /ovPlans/.test(o));
}