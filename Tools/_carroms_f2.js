'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join('app', 'src', 'main', 'assets', 'games', 'carroms', 'index.html');
let s = fs.readFileSync(FILE, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
let lines = s.split(NL);
const find = (t, from = 0) => { for (let k = from; k < lines.length; k++) if (lines[k].includes(t)) return k; return -1; };
function range(startText, count, replacement, label) {
  const i = find(startText);
  if (i < 0) { console.log('MISS  ' + label); return; }
  lines.splice(i, count, ...replacement);
  console.log('OK   ' + label);
}

/* ---- 1. panel transitions ---- */
range("    overlay.classList.add('visible');", 2,
  [
    '    /* Drop the outgoing panel FIRST, then mount the incoming one a frame later.',
    '       Toggling every panel in one pass animated the old and the new together',
    '       while the backdrop was still fading - that is the stutter. */',
    "    const prev=document.querySelector('.panel.showing');",
    "    if(prev&&prev.id!==id) prev.classList.remove('showing');",
    "    overlay.classList.add('visible');",
    '    const next=document.getElementById(id);',
    '    if(next&&prev!==next){',
    "      next.classList.remove('showing');   /* restart the pop cleanly */",
    '      requestAnimationFrame(()=>requestAnimationFrame(()=>{',
    '        if(document.getElementById(id)===next) next.classList.add(\'showing\');',
    '      }));',
    "    } else if(next){ next.classList.add('showing'); }",
    "    S('open')",
  ],
  'panel transitions staged');

/* ---- 2. one tap, one click sound ---- */
range("document.addEventListener('pointerdown',e=>{", 4,
  [
    "/* This is the single owner of the click sound. Several button handlers also",
    "   called S('click') themselves, so pressing one of those played it TWICE -",
    "   once from this pointerdown and once from its own handler. The handlers are",
    "   left alone (they do other work) but the sound is claimed once per press. */",
    'let _clickClaimed=false;',
    "document.addEventListener('pointerdown',e=>{",
    '  audioEnsure();',
    "  if(e.target.closest('button')){",
    "    if(!_clickClaimed){ _clickClaimed=true; S('click');Hap.tap();",
    '      setTimeout(()=>{_clickClaimed=false;},0); }',
    '  }',
    '});',
  ],
  'click sound claimed once per press');

/* ---- 4. game over: panel first, ad immediately after ---- */
range('  try{ if(!window.__shellOverAd){ window.__shellOverAd=1;', 2,
  [
    '  /* The game is over. The panel is mounted by Panels.show(\'p-over\') below and the',
    '     ad is requested the instant after, instead of the ad running first. */',
    "  window.__shellAd(function(){},'carroms.gameover');",
  ],
  'game over: ad after the panel');

fs.writeFileSync(FILE, lines.join(NL));

const out = fs.readFileSync(FILE, 'utf8');
console.log('\nchecks:');
console.log('  staged mount :', /requestAnimationFrame\(\(\)=>requestAnimationFrame/.test(out));
console.log('  click once   :', /_clickClaimed/.test(out));
console.log('  over ad      :', /window\.__shellAd\(function\(\)\{\},'carroms\.gameover'\);/.test(out));
console.log('  no old toggle:', !/classList\.toggle\('showing'/.test(out));