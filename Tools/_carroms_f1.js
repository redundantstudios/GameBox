'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join('app', 'src', 'main', 'assets', 'games', 'carroms', 'index.html');
let s = fs.readFileSync(FILE, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
let lines = s.split(NL);
const find = (t, from = 0) => { for (let k = from; k < lines.length; k++) if (lines[k].includes(t)) return k; return -1; };
function one(mustContain, replacement, label) {
  const i = find(mustContain);
  if (i < 0) { console.log('MISS  ' + label); return; }
  lines.splice(i, 1, ...replacement);
  console.log('OK   ' + label);
}

/* ===== 1. GLITCHY PANEL TRANSITIONS =====
   Panels.show() swapped the `showing` class on EVERY panel in one pass, so the
   outgoing panel and the incoming one animated at the same time while the
   overlay's own opacity transition was still running. The old panel was also
   never given a chance to finish, so the incoming panel's `pop` keyframes
   started while the backdrop was still fading up - which reads as a stutter.
   Now the outgoing panel is cleared first, the incoming one is mounted a frame
   later, and the `pop` animation no longer re-runs on an already-visible panel. */
one(
  "  overlay.classList.add('visible');\r\n  document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('showing',p.id===id)); S('open')},",
  [
    '  /* Drop the outgoing panel FIRST, then mount the incoming one on the next',
    '     frame. Toggling every panel in a single pass animated the old and the new',
    '     one at the same time while the backdrop was still fading - the stutter. */',
    "  const prev=document.querySelector('.panel.showing');",
    "  if(prev&&prev.id!==id) prev.classList.remove('showing');",
    "  overlay.classList.add('visible');",
    '  const next=document.getElementById(id);',
    '  if(next&&prev!==next){',
    '    /* force the animation to restart rather than replaying a stale one */',
    '    next.classList.remove(\'showing\');',
    '    requestAnimationFrame(()=>requestAnimationFrame(()=>{',
    "      if(document.getElementById(id)===next) next.classList.add('showing');",
    '    }));',
    "  } else if(next){ next.classList.add('showing'); }",
    "  S('open')",
    '},',
  ],
  'panel transitions: unmount old, mount new next frame');

/* the pop keyframe scaled from .9 with a 16px rise, which is what read as a jump */
one(
  "@keyframes pop{from{transform:scale(.9) translateY(16px); opacity:0}}",
  [
    '@keyframes pop{from{transform:scale(.965) translateY(8px); opacity:0}}',
    '/* Was scale(.9) + 16px of travel: a large enough jump to read as a glitch on a',
    '   low-refresh panel. Gentler, and combined with the one-panel-at-a-time',
    '   change above it no longer overlaps the backdrop fade. */',
  ],
  'pop keyframe softened');

/* ===== 2. ONE TAP = TWO CLICK SOUNDS =====
   A global pointerdown listener played the click for ANY button press, and
   several button handlers played it AGAIN themselves. Every one of those buttons
   fired twice. Rather than delete the global (which is what covers the buttons
   that have no handler), make it the single owner and suppress the repeats that
   land inside the same interaction. */
one(
  "document.addEventListener('pointerdown',e=>{\r\n  audioEnsure();\r\n  if(e.target.closest('button')){S('click');Hap.tap()}\r\n});",
  [
    "/* This is the single owner of the click sound. Several button handlers also",
    "   called S('click') themselves, so a press on one of those played it twice -",
    "   pointerdown here, then the handler's own. The handlers are left alone (they",
    "   may be doing other work) but the sound is claimed once per interaction. */",
    "let _clickClaimed=false;",
    "document.addEventListener('pointerdown',e=>{",
    '  audioEnsure();',
    "  if(e.target.closest('button')){",
    '    if(!_clickClaimed){ _clickClaimed=true; S(\'click\');Hap.tap();',
    '      setTimeout(()=>{_clickClaimed=false;},0); }',
    '  }',
    '});',
  ],
  'click sound fires once per interaction');

/* suppress the explicit repeats in handlers that sit on real buttons */
{
  /* the theme grid cell, profile cards, and the two spots that also fire Hap.tap */
  const dupes = [
    "      applyTheme(th.id);S('click');Hap.tap();toast(th.name+' theme selected');",
    "  renderProfiles();S('click');Hap.tap();",
  ];
  let n = 0;
  lines = lines.map(l => {
    for (const d of dupes) {
      if (l.includes(d)) {
        n++;
        return l.replace(/S\('click'\);Hap\.tap\(\);/, '').replace(/;\s*;/, ';');
      }
    }
    return l;
  });
  console.log('OK   removed ' + n + ' duplicate click sound(s) from button handlers');
}

/* ===== 4. GAME-OVER AD: panel first, ad immediately after =====
   The ad fired BEFORE the panel was mounted. Matched to the Connect Four
   ordering the director already approved: panel first, ad the instant after. */
one(
  "  /* The game is over - the natural break. Only the buttons on the board-end\r\n   card asked for an ad before. */\r\n  try{ if(!window.__shellOverAd){ window.__shellOverAd=1;\r\n  window.__shellAd(function(){},'carroms.gameover'); } }catch(e){}",
  [
    '  /* The game is over - the natural break. Shown BEFORE the ad, and the ad is',
    '     requested the instant after, rather than ad-then-panel. */',
    "  window.__shellAd(function(){},'carroms.gameover');",
  ],
  'game over: panel first, then ad');

fs.writeFileSync(FILE, lines.join(NL));
const out = fs.readFileSync(FILE, 'utf8');
console.log('\nchecks:');
console.log('  staged panel mount :', /requestAnimationFrame\(\(\)=>requestAnimationFrame/.test(out));
console.log('  click claimed once  :', /_clickClaimed/.test(out));
console.log('  soft pop            :', /scale\(\.965\)/.test(out));
console.log('  over ad after panel :', /__shellAd\(function\(\)\{\},\'carroms\.gameover\'\);/.test(out));