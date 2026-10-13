'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join('app', 'src', 'main', 'assets', 'games', 'knot-away', 'index.html');
let s = fs.readFileSync(FILE, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
let lines = s.split(NL);
const find = (t, from = 0) => { for (let k = from; k < lines.length; k++) if (lines[k].includes(t)) return k; return -1; };

/* Replace the shell's generic back-button block with a themed, centred one. */
{
  const start = lines.findIndex(l => l.indexOf('/* ---------- back button, start screen only ---------- */') >= 0);
  if (start < 0) { console.log('MISS back block'); process.exit(1); }
  let end = start;
  while (end < lines.length && lines[end].indexOf('}catch(e){}') < 0) end++;
  if (end >= lines.length) { console.log('MISS back block end'); process.exit(1); }

  lines.splice(start, end - start + 1,
    '/* ---------- back button: start page only, in the game\'s own style ---------- */',
    '/* The shell supplies a generic white circle sized for a light game. This is a',
    '   warm parchment-and-walnut board, so that reads as a sticker. Repainted to',
    '   match, the chevron centred properly (the shell rewrote style.display on its',
    '   poll, which used to throw the centring away), and it plays the game tap. */',
    'try{',
    '  var btn=document.createElement(\'button\');',
    '  btn.setAttribute(\'aria-label\',\'Back\');',
    '  btn.id=\'__knotBackWood\';',
    "  btn.style.cssText='position:fixed;z-index:9998;top:calc(12px + env(safe-area-inset-top));'+",
    "    'left:calc(12px + env(safe-area-inset-left));width:40px;height:40px;border-radius:50%;'+",
    "    'padding:0;margin:0;box-sizing:border-box;cursor:pointer;'+",
    "    'background:radial-gradient(circle at 35% 28%,#FFF6E2,#EFDFBC 58%,#D8C096);'+",
    "    'border:1px solid rgba(74,47,21,.45);color:#4A2F14;'+",
    "    'font-family:Georgia,\\'Times New Roman\\',serif;font-size:24px;line-height:1;font-weight:700;'+",
    "    'box-shadow:0 3px 8px rgba(0,0,0,.3),inset 0 1px 1px rgba(255,255,255,.7);'+",
    "    '-webkit-tap-highlight-color:transparent;transition:transform .12s,box-shadow .12s';",
    "  btn.innerHTML='&#8249;';",
    '  var prevBtn=btn.onclick;',
    '  btn.onclick=function(ev){',
    '    if(ev&&ev.preventDefault)ev.preventDefault();',
    '    try{ AudioSys.sfx(\'click\'); }catch(e){}',
    '    if(prevBtn){ prevBtn(ev); return; }',
    '    try{ if(B.exitGame)B.exitGame(); }catch(e){}',
    '  };',
    '  try{',
    "    var bst=document.createElement('style');",
    "    bst.textContent='#__knotBackWood{display:none!important}'+",
    "      '#__knotBackWood.on{display:flex!important;align-items:center;justify-content:center;'+",
    "      'line-height:1;padding-bottom:2px}'+",
    "      '#__knotBackWood.on:active{transform:scale(.9)}';",
    '    (document.head||document.documentElement).appendChild(bst);',
    '  }catch(e){}',
    '  var attach=function(){ if(!btn.parentNode)document.body.appendChild(btn); };',
    '  if(document.body)attach(); else document.addEventListener(\'DOMContentLoaded\',attach);',
    '  window.__shellBackBtn=btn;',
    '}catch(e){}');
  console.log('OK   back button restyled to the game theme');
}

/* visibility: our own poll, keyed on the start page, writing only on change. */
{
  const i = find('  if(window.__shellBackBtn){');
  if (i < 0) { console.log('MISS back poll'); }
  else {
    lines.splice(i, 3,
      '  if(window.__shellBackBtn){',
      "    /* Start page only, and only written when it changes: the shell's",
      '       unconditional 400ms write forced a style invalidation every tick. */',
      "    var onHome=(sc===HOME);",
      '    if(onHome!==window.__shellBackBtn.__wasHome){',
      '      window.__shellBackBtn.__wasHome=onHome;',
      "      window.__shellBackBtn.classList.toggle('on',onHome);",
      '    }',
      '  }');
    console.log('OK   back button visibility: start page only, on change');
  }
}

fs.writeFileSync(FILE, lines.join(NL));
const out = fs.readFileSync(FILE, 'utf8');
console.log('  verify:', /__knotBackWood/.test(out) && /classList\.toggle\('on',onHome\)/.test(out));