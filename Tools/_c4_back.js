'use strict';
const fs = require('fs');
const path = require('path');
const f = path.join('app', 'src', 'assets', 'games'.replace('src', 'src'), 'connect-four', 'index.html');
let s = fs.readFileSync(f, 'utf8');
const CRLF = s.includes('\r\n');

if (/themeShellBack/.test(s)) { console.log('already themed'); process.exit(0); }

const BLOCK = [
  '',
  '/* The shell injects its own back button: a plain white circle with a chevron,',
  '   sized for a generic light game. On this dark walnut board it read as a',
  '   sticker sitting on top of the art, and it exited silently while every other',
  "   control in the game makes a sound. Repaint it in the game's own .barbtn",
  '   wood treatment and give it the game tap - wrapping the shell handler rather',
  '   than replacing it, so it still exits. */',
  'function themeShellBack(){',
  '  var b=window.__shellBackBtn;',
  '  if(!b||b.__woodThemed)return;',
  '  b.__woodThemed=true;',
  "  b.id='__shellBackWood';",
  "  b.style.cssText='position:fixed;z-index:9998;top:calc(10px + env(safe-area-inset-top));'+",
  "    'left:calc(10px + env(safe-area-inset-left));width:38px;height:38px;border-radius:50%;'+",
  "    'display:none;align-items:center;justify-content:center;padding:0;margin:0;cursor:pointer;'+",
  "    \"font-family:Georgia,'Times New Roman',serif;font-size:23px;line-height:1;font-weight:700;\"+",
  "    'background:radial-gradient(circle at 35% 30%,#a97844,#7c5426 62%,#5a3a15);'+",
  "    'border:1px solid #3a2410;color:#f3e2c2;'-webkit-tap-highlight-color:transparent;'+",
  "    'box-shadow:0 3px 6px rgba(0,0,0,.5),inset 0 1px 1px rgba(255,230,180,.4),'+",
  "    'inset 0 -2px 3px rgba(0,0,0,.3);transition:transform .1s';",
  '  var prev=b.onclick;',
  '  b.onclick=function(ev){',
  '    if(ev&&ev.preventDefault)ev.preventDefault();',
  "    try{ SFX.tap(); }catch(e){}",
  '    if(prev){ prev(ev); return; }',
  '    try{ if(window.NativeBridge&&window.NativeBridge.exitGame)window.NativeBridge.exitGame(); }catch(_){}',
  '  };',
  '  try{',
  "    var st=document.createElement('style');",
  "    st.textContent='#__shellBackWood:active{transform:scale(.88)}';",
  '    (document.head||document.documentElement).appendChild(st);',
  '  }catch(e){}',
  '}',
  '/* The shell block runs after this one, so the button does not exist yet on the',
  '   first pass. Poll briefly until it appears, then leave it alone. */',
  'var _woodPoll=0;',
  'var _woodTimer=setInterval(function(){',
  '  themeShellBack();',
  '  if(window.__shellBackBtn||++_woodPoll>40){ clearInterval(_woodTimer); }',
  '},100);',
  '',
].join(CRLF);

const lines = s.split(/\r?\n/);
const i = lines.findIndex(l => /^function refreshUI\(\)\{/.test(l));
if (i < 0) { console.log('MISS refreshUI anchor'); process.exit(1); }
lines.splice(i, 0, ...BLOCK.split(CRLF));
fs.writeFileSync(f, lines.join(CRLF));
console.log('OK   back button themed + tap sound');

const out = fs.readFileSync(f, 'utf8');
console.log('  verify:', /function themeShellBack/.test(out) && /#a97844/.test(out) && /SFX\.tap\(\); \}\}\)/.test(out));