'use strict';
const fs = require('fs');
const path = require('path');
const NL = f => fs.readFileSync(f, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const KA = path.join('app', 'src', 'main', 'assets', 'games', 'knot-away', 'index.html');
const MI = path.join('app', 'src', 'main', 'assets', 'games', 'mimic', 'index.html');
const rd = f => fs.readFileSync(f, 'utf8').split(NL(f));
const wr = (f, l) => fs.writeFileSync(f, l.join(NL(f)));

/* ============ KNOT AWAY: live 30-minute countdown ============ */
{
  const L = rd(KA);

  /* style */
  const c = L.findIndex(l => /^\.tile \.ad-chip\{/.test(l || ''));
  if (c < 0) { console.log('MISS chip css'); process.exit(1); }
  L.splice(c + 6, 0,
    '/* Live countdown on a level that was opened by an ad. Warm gold while there',
    '   is plenty of time, red inside the last minute so it is obvious it is about',
    '   to lapse back to locked. */',
    '.tile .t-timer{font-family:var(--mono,monospace);font-size:11px;font-weight:900;',
    '  letter-spacing:.04em;color:#8A5A10;background:rgba(232,176,75,.28);',
    '  padding:2px 6px;border-radius:8px;min-width:42px;text-align:center}',
    '.tile .t-timer.low{color:#8C1D14;background:rgba(224,74,58,.24)}',
    '#hudLevel .t-timer{color:#FFE9B8;background:rgba(255,255,255,.14)}',
    '#hudLevel .t-timer.low{color:#FFC9C0}');
  console.log('OK   timer CSS');

  /* formatter + ticker */
  const i = L.findIndex(l => /^function renderLevels\(\)/.test(l || ''));
  if (i < 0) { console.log('MISS renderLevels'); process.exit(1); }
  L.splice(i, 0,
    '/* The 30 minutes is real time, so it is shown counting down rather than',
    ' * frozen at the moment of the grant. The absolute expiry is kept on the',
    ' * element, so a reload mid-countdown resumes the right number instead of',
    ' * restarting from 30:00. */',
    'function fmtRemain(ms){',
    '  if(ms<=0)return \'00:00\';',
    '  const s=Math.ceil(ms/1000);',
    "  return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');",
    '}',
    'let adTickId=null;',
    'function stopAdTick(){ if(adTickId){ clearInterval(adTickId); adTickId=null; } }',
    'function startAdTick(){',
    '  stopAdTick();',
    '  const el=document.querySelector(\'#levelsGrid .t-timer\');',
    '  if(!el)return;',
    '  const tick=function(){',
    '    const e=document.querySelector(\'#levelsGrid .t-timer\');',
    '    /* Left the level list: showScreen() starts this again on the way back. */',
    '    if(!e){ stopAdTick(); return; }',
    '    const left=Number(e.getAttribute(\'data-until\'))-Date.now();',
    '    if(left<=0){',
    '      stopAdTick();',
    '      delete save.temp;',
    '      persist();',
    '      renderLevels();',
    '      kaToast(\'LEVEL LOCKED AGAIN\');',
    '      return;',
    '    }',
    "    e.textContent=fmtRemain(left);",
    '    e.classList.toggle(\'low\',left<=60000);',
    '  };',
    '  tick();',
    '  adTickId=setInterval(tick,1000);',
    '}',
    '');
  console.log('OK   fmtRemain + ticker');

  /* tile markup: countdown replaces the lock on the ad-opened level */
  const m = L.findIndex(l => /t\.innerHTML=unlocked$/.test((l || '').trim()));
  if (m < 0) { console.log('MISS tile markup'); process.exit(1); }
  L.splice(m, 3,
    '    const tmp=(tempLevel()&&tempLevel().lvl===i)?tempLevel():null;',
    '    t.innerHTML=tmp',
    '      ?`<span class="t-num">${i+1}</span><span class="t-timer" data-until="${tmp.until}">${fmtRemain(tmp.until-Date.now())}</span><span class="t-stars">${[0,1,2].map(s=>starSvg(rec&&rec.stars>s)).join(\'\')}</span>`',
    '      :unlocked',
    '        ?`<span class="t-num">${i+1}</span><span class="t-stars">${[0,1,2].map(s=>starSvg(rec&&rec.stars>s)).join(\'\')}</span>`',
    '        :`<span class="t-num">${i+1}</span>${LOCK_SVG}${adOK?AD_CHIP:""}`;');
  console.log('OK   tile shows the countdown');

  /* an ad-opened level should look open, not locked */
  const cl = L.findIndex(l => /t\.className='tile'\+/.test(l || ''));
  L.splice(cl, 1,
    "    t.className='tile'+(unlocked&&!tmp?' locked':'')+((unlocked&&!rec&&!tmp)?' current':'')+(adOK?' ad-open':'')+(tmp?' ad-temp':'');");

  /* start/stop the ticker with the screen funnel */
  const s = L.findIndex(l => /if\(name==='levels'\)renderLevels\(\);/.test(l || ''));
  if (s < 0) { console.log('MISS showScreen'); process.exit(1); }
  L.splice(s, 1,
    "  if(name==='levels'){ renderLevels(); startAdTick(); } else stopAdTick();");
  console.log('OK   ticker tied to the screen funnel');

  /* in-game chip on the ad-opened level */
  const h = L.findIndex(l => /\$\('#hudLevel'\)\.textContent='LEVEL '/.test(l || ''));
  if (h < 0) { console.log('MISS hudLevel'); process.exit(1); }
  L.splice(h, 1,
    "  const tmp=tempLevel();",
    "  $('#hudLevel').textContent='LEVEL '+(G.lvlIdx+1);",
    "  /* while an ad-opened level is being played, show what is left of it */",
    "  const th=$('#hudLevel').querySelector('.t-timer');",
    '  if(tmp&&tmp.lvl===G.lvlIdx){',
    "    if(!th){ const s=document.createElement('span'); s.className='t-timer'; s.setAttribute('data-until',tmp.until); $('#hudLevel').appendChild(s); }",
    "  } else if(th){ th.remove(); }");
  console.log('OK   in-game chip');

  wr(KA, L);
  const o = fs.readFileSync(KA, 'utf8');
  console.log('  fmtRemain :', /function fmtRemain/.test(o));
  console.log('  ticker    :', /function startAdTick/.test(o) && /setInterval\(tick,1000\)/.test(o));
  console.log('  wired     :', /renderLevels\(\); startAdTick\(\);/.test(o));
}

/* ============ MIMIC: centre the back glyph ============ */
{
  const L = rd(MI);
  const i = L.findIndex(l => /function drawBackArrow\(x,y,r\)\{/.test(l || ''));
  if (i < 0) { console.log('MISS drawBackArrow'); process.exit(1); }
  let end = i;
  while (end < L.length && L[end].trim() !== '}') end++;
  L.splice(i, end - i + 1,
    '/* The back glyph: a shaft with an open head, pointing left. The extents are',
    ' * symmetric about x (-0.78r to +0.78r) - the previous version ran from -0.8r',
    ' * to +1.5r, which left the arrow sitting visibly right of centre in the',
    ' * button. Vertical extent is symmetric too, so it sits on the centre line. */',
    'function drawBackArrow(x,y,r){',
    '  ctx.save();',
    '  ctx.strokeStyle=DARK;',
    '  ctx.lineWidth=Math.max(2.4,r*0.13);',
    "  ctx.lineCap='round'; ctx.lineJoin='round';",
    '  const Lf=r*0.78, T=r*0.30, h=r*0.46;',
    '  /* shaft: from the tail on the right into the head */',
    '  ctx.beginPath(); ctx.moveTo(x+Lf,y); ctx.lineTo(x-T*0.55,y); ctx.stroke();',
    '  /* open head, apex on the left */',
    '  ctx.beginPath(); ctx.moveTo(x+T,y-h); ctx.lineTo(x-Lf,y); ctx.lineTo(x+T,y+h); ctx.stroke();',
    '  ctx.restore();',
    '}');
  wr(MI, L);
  const o = fs.readFileSync(MI, 'utf8');
  console.log('\nOK   mimic glyph centred');
  console.log('  symmetric  :', /const Lf=r\*0\.78/.test(o));
  console.log('  no +1.5r   :', !/x\+s\*1\.5/.test(o));
}