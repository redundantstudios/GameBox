'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join('app', 'src', 'main', 'assets', 'games', 'connect-four', 'index.html');
let s = fs.readFileSync(FILE, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
let lines = s.split(NL);
const idx = (t, from = 0) => { for (let k = from; k < lines.length; k++) if (lines[k].includes(t)) return k; return -1; };

/* ===== 4a. afterAd() - resync everything after a fullscreen ad ===== */
{
  const i = idx('function shellAd(cb,placement){');
  if (i < 0) console.log('MISS shellAd');
  else {
    /* End of shellAd is the line before the first blank-then-comment after it. */
    let j = i;
    while (j < lines.length && !/^\}$/.test(lines[j])) j++;
    lines.splice(j + 1, 0,
      '',
      '/* A fullscreen interstitial stops requestAnimationFrame for its whole',
      '   duration. Coming back, the frame clock is stale, the particle backlog is',
      '   old, and the full-screen board textures have usually been dropped from the',
      '   GPU while the ad had the display. Skipping all of that is what left the',
      '   game crawling for several seconds after every ad. */',
      'function afterAd(){',
      '  try{',
      '    last=0; gt=0;            /* resync the frame clock          */',
      '    parts.length=0;          /* stale particles                 */',
      '    aiId++;                  /* cancel any queued bot move      */',
      '    S.pending=null; S.thinking=false;',
      '    _introBGKey="";          /* repaint the start plank if shown */',
      '    resize();                /* re-upload the board textures    */',
      '  }catch(e){}',
      '}',
      '');
    console.log('OK   afterAd()');
  }
}

/* route every ad return through it */
{
  const i = idx('function shellAd(cb,placement){');
  if (i < 0) console.log('MISS shellAd body');
  else {
    let j = i;
    while (j < lines.length && !/^\}$/.test(lines[j])) j++;
    lines.splice(i, j - i + 1,
      'function shellAd(cb,placement){',
      '  try{',
      '    if(window.__shellAd){',
      '      window.__shellAd(function(){ try{ afterAd(); }catch(e){} if(cb)cb(); },placement);',
      '      return;',
      '    }',
      '  }catch(e){}',
      '  if(cb)cb();',
      '}');
    console.log('OK   shellAd calls afterAd on return');
  }
}

/* ===== 4b. resize() must not rebuild the artwork when nothing changed =====
   Showing and hiding an ad fires a burst of resize events, and every one of them
   rebuilt a full-screen table canvas and re-bored all 42 holes with gradients.
   That is the other half of the post-ad crawl. */
{
  const i = idx('  buildTable();buildBoard();');
  if (i < 0) console.log('MISS build calls');
  else {
    lines.splice(i, 1,
      '  /* Ad show/hide fires a burst of resize events, and each one used to',
      '     rebuild a full-screen table canvas and re-bore all 42 holes. Skip when',
      '     nothing that affects the artwork actually changed. The bar hiding is part',
      '     of the key because the board geometry shifts with it. */',
      "  const key=vw+'x'+vh+'@'+dpr+'/'+(barEl.classList.contains('hide')?'h':'v');",
      '  if(key===_sizeKey)return;',
      '  _sizeKey=key;',
      '  buildTable();buildBoard();');
    const d = idx('function resize(){');
    if (d < 0) console.log('MISS resize decl');
    else lines.splice(d, 0, 'let _sizeKey="";');
    console.log('OK   resize() caches by geometry');
  }
}

/* ===== 1. back button: centre the glyph, and own the visibility =====
   The shell's poll overwrites style.display with 'block', which threw away the
   flex centring and pinned the chevron to the top-left of the circle. Now the
   button is styled with !important rules and this game's own poll sets a class,
   so the shell's inline display is ignored in BOTH directions. */
{
  const i = idx('/* The shell injects its own back button');
  if (i < 0) console.log('MISS back button block');
  else {
    let j = i;
    while (j < lines.length && !lines[j].includes('},100);')) j++;
    if (j >= lines.length) { console.log('MISS back button end'); }
    else {
      lines.splice(i, j - i + 1,
        '/* The shell injects its own back button: a plain white circle with a chevron,',
        "   sized for a generic light game. On this dark walnut board it read as a sticker",
        '   laid over the art, and it exited silently while every other control in the game',
        "   makes a sound. Repaint it in the game's own .barbtn wood treatment and give it",
        '   the game tap - wrapping the shell handler rather than replacing it, so it still',
        '   exits.',
        '   Visibility: the shell poll writes style.display every 400ms, which also',
        '   overwrote the flex centring and left the chevron jammed into the corner. The',
        '   rules here are !important so the inline display is ignored in both directions,',
        "   and this game's own poll sets a class instead. */",
        'function themeShellBack(){',
        '  var b=window.__shellBackBtn;',
        '  if(!b||b.__woodThemed)return;',
        '  b.__woodThemed=true;',
        "  b.id='__shellBackWood';",
        "  b.style.cssText='position:fixed;z-index:9998;top:calc(10px + env(safe-area-inset-top));'+",
        "    'left:calc(10px + env(safe-area-inset-left));width:38px;height:38px;border-radius:50%;'+",
        "    'padding:0;margin:0;cursor:pointer;box-sizing:border-box;'+",
        "    \"font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1;font-weight:700;\"+",
        "    'background:radial-gradient(circle at 35% 30%,#a97844,#7c5426 62%,#5a3a15);'+",
        "    'border:1px solid #3a2410;color:#f3e2c2;-webkit-tap-highlight-color:transparent;'+",
        "    'box-shadow:0 3px 6px rgba(0,0,0,.5),inset 0 1px 1px rgba(255,230,180,.4),'+",
        "    'inset 0 -2px 3px rgba(0,0,0,.3);transition:transform .1s';",
        '  var prev=b.onclick;',
        '  b.onclick=function(ev){',
        '    if(ev&&ev.preventDefault)ev.preventDefault();',
        '    try{ SFX.tap(); }catch(e){}',
        '    if(prev){ prev(ev); return; }',
        '    try{ if(window.NativeBridge&&window.NativeBridge.exitGame)window.NativeBridge.exitGame(); }catch(_){}',
        '  };',
        '  try{',
        "    var st=document.createElement('style');",
        "    st.textContent='#__shellBackWood{display:none!important}'+",
        "      '#__shellBackWood.on{display:flex!important;align-items:center;justify-content:center}'+",
        "      '#__shellBackWood.on:active{transform:scale(.88)}';",
        '    (document.head||document.documentElement).appendChild(st);',
        '  }catch(e){}',
        '}',
        '/* Runs for the life of the page, not just until the button appears. */',
        'var _backShown=false;',
        'setInterval(function(){',
        '  var b=window.__shellBackBtn;',
        '  if(!b)return;',
        '  themeShellBack();',
        "  var on=(window.__shellScreen==='home');",
        '  if(on===b.classList.contains(\'on\'))return;',
        "  if(on)b.classList.add('on'); else b.classList.remove('on');",
        '  void _backShown;',
        '},150);',
        '');
      console.log('OK   back button centred + visibility owned');
    }
  }
}

fs.writeFileSync(FILE, lines.join(NL));
console.log('\nstage 2 written (' + lines.length + ' lines)');