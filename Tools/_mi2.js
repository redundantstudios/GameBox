'use strict';
const fs = require('fs');
const path = require('path');
const F = path.join('app', 'src', 'main', 'assets', 'games', 'mimic', 'index.html');
let s = fs.readFileSync(F, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
let lines = s.split(NL);

/* ===== 2. BEST SCORE: TOP -> MIDDLE, BELOW HOW TO PLAY =====
   It was parked in the top-right corner beside the settings gear. The director
   wants it in the middle of the start page, under the HOW TO PLAY button, so the
   top corners are left to the back and settings controls. */
{
  const start = lines.findIndex(l => l.indexOf('const bs=bests[diffKey].s||0;') >= 0);
  if (start < 0) { console.log('MISS best card'); process.exit(1); }
  let end = start;
  while (end < lines.length && lines[end].indexOf('UI.best=') < 0) end++;
  if (end >= lines.length) { console.log('MISS best end'); process.exit(1); }

  lines.splice(start, end - start + 1,
    '  const bs=bests[diffKey].s||0;',
    '  const bpW=104, bpH=42;',
    '  /* Centred under the HOW TO PLAY button. This card was parked in the top',
    '   right beside the settings gear, where it read as a status chip crowding',
    '   the corner controls. The title geometry already knows where that button',
    '   sits (g.howY / g.btnH), so it is anchored to the button rather than to the',
    '   viewport - the two stay together at any screen size. */',
    '  const bpx=W/2-bpW/2;',
    '  const bpy=g.howY+g.btnH+20;',
    '  ctx.save();',
    "  ctx.fillStyle='rgba(74,55,40,0.14)'; rr(bpx+2,bpy+7,bpW,bpH,20); ctx.fill();",
    '  ctx.fillStyle=C_DARK; rr(bpx,bpy+4,bpW,bpH,20); ctx.fill();',
    '  ctx.fillStyle=CREAM; rr(bpx,bpy,bpW,bpH,20); ctx.fill();',
    "  ctx.fillStyle='rgba(255,255,255,0.22)'; rr(bpx+8,bpy+5,bpW-16,6,3); ctx.fill();",
    '  ctx.fillStyle=PAL[1]; starAt(ctx,bpx+22,bpy+17,8);',
    "  ctx.font='800 15px '+FONT; ctx.textAlign='left'; ctx.textBaseline='middle';",
    '  ctx.fillStyle=DARK; ctx.fillText(\'\'+bs, bpx+36, bpy+17);',
    "  ctx.font='800 9px '+FONT; ctx.fillStyle='rgba(74,55,40,0.5)';",
    '  ctx.fillText(diffKey.toUpperCase(), bpx+36, bpy+31);',
    '  ctx.restore();',
    '  UI.best={x:bpx-8,y:bpy-8,w:bpW+16,h:bpH+16};');
  console.log('OK   best score moved below HOW TO PLAY, centred');
}

/* ===== 1. START-PAGE BACK BUTTON: PROPER ICON + GAME STYLING ===== */
{
  const i = lines.findIndex(l => l.indexOf('window.__shellBackBtn=btn;') >= 0);
  if (i < 0) { console.log('MISS back btn'); process.exit(1); }
  let start = i;
  while (start > 0 && lines[start - 1].indexOf('try{') < 0) start--;
  let end = i;
  while (end < lines.length && lines[end].trim() !== '}catch(e){}') end++;
  if (end >= lines.length) { console.log('MISS back end'); process.exit(1); }

  lines.splice(start, end - start + 1,
    'try{',
    "  var btn=document.createElement('button');",
    "  btn.setAttribute('aria-label','Back');",
    "  btn.id='__mimicBack';",
    "  /* A typed chevron glyph read as a stray punctuation mark. This is a proper",
    "     arrow, drawn in the same clay style as the game's own buttons, and it",
    '     plays the game tap like everything else. */',
    "  btn.innerHTML='<svg viewBox=\"0 0 24 24\" width=\"21\" height=\"21\" fill=\"none\" ' +",
    "    'stroke=\"currentColor\" stroke-width=\"2.6\" stroke-linecap=\"round\" ' +",
    "    'stroke-linejoin=\"round\"><path d=\"M15 5 L8 12 L15 19\"/></svg>';",
    "  btn.style.cssText='position:fixed;z-index:9998;top:calc(12px + env(safe-area-inset-top));'+",
    "    'left:calc(12px + env(safe-area-inset-left));width:42px;height:42px;border-radius:50%;'+",
    "    'display:none;align-items:center;justify-content:center;padding:0;margin:0;cursor:pointer;'+",
    "    'font-family:inherit;color:#4A2F14;box-sizing:border-box;transition:transform .1s;'+",
    "    'background:radial-gradient(circle at 35% 28%,#F7EFE0,#E6D6BC 60%,#D2BC9B);'+",
    "    'border:1px solid rgba(74,55,40,.28);-webkit-tap-highlight-color:transparent;'+",
    "    'box-shadow:0 3px 7px rgba(74,55,40,.3),inset 0 1px 1px rgba(255,255,255,.8)';",
    '  var prevBack=btn.onclick;',
    '  btn.onclick=function(ev){',
    '    if(ev&&ev.preventDefault)ev.preventDefault();',
    "    try{ SFX.tap(); }catch(e){}",
    '    if(prevBack){ prevBack(ev); return; }',
    '    try{ if(window.NativeBridge&&window.NativeBridge.exitGame)window.NativeBridge.exitGame(); }catch(_){}',
    '  };',
    "  try{ var bst=document.createElement('style'); bst.textContent='#__mimicBack:active{transform:scale(.9)}'; (document.head||document.documentElement).appendChild(bst); }catch(e){}",
    '  var attach=function(){ if(!btn.parentNode)document.body.appendChild(btn); };',
    "  if(document.body)attach(); else document.addEventListener('DOMContentLoaded',attach);",
    '  window.__shellBackBtn=btn;',
    '}catch(e){}');
  console.log('OK   back button: svg arrow + clay styling + tap');
}

/* the shell poll writes display directly; route it through the class so the
   flex centring of the new icon is not thrown away again */
{
  const i = lines.findIndex(l => l.indexOf("window.__shellBackBtn.style.display=") >= 0);
  if (i < 0) console.log('MISS back poll');
  else {
    lines[i] = "        if(onHome!==window.__shellBackBtn.__wasHome){ window.__shellBackBtn.__wasHome=onHome; window.__shellBackBtn.classList.toggle('on',onHome); }";
    console.log('OK   back button visibility via class');
  }
}

fs.writeFileSync(F, lines.join(NL));
const out = fs.readFileSync(F, 'utf8');
console.log('  best centred :', /const bpx=W\/2-bpW\/2;/.test(out) && /g\.howY\+g\.btnH\+20/.test(out));
console.log('  svg arrow    :', /M15 5 L8 12 L15 19/.test(out));
console.log('  tap sound    :', /SFX\.tap\(\); \}\}\)\n/.test(out) || /try\{ SFX\.tap\(\); \}/.test(out));