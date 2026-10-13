'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join('app', 'src', 'main', 'assets', 'games', 'carroms', 'index.html');
let s = fs.readFileSync(FILE, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
let lines = s.split(NL);
const find = (t, from = 0) => { for (let k = from; k < lines.length; k++) if (lines[k].includes(t)) return k; return -1; };
function one(t, replacement, label) {
  const i = find(t);
  if (i < 0) { console.log('MISS  ' + label); return; }
  lines.splice(i, 1, ...replacement);
  console.log('OK   ' + label);
}

/* ===== 5. FIRST TAP / BGM =====
   audioEnsure() was only ever called from a pointerdown listener, so the graph
   was built on the first touch: the game opened silent and the first tap did
   nothing except arm the audio. The shell lifts Chromium's autoplay gesture
   gate, so it can be built on load - and the BGM starts with it. */
{
  const i = find('function audioEnsure(){');
  if (i < 0) console.log('MISS audioEnsure');
  else {
    lines.splice(i + 1, 0,
      '  /* Built on load, not on the first tap. The shell lifts the autoplay gate, so',
      '     the graph and the BGM can start immediately instead of the first tap',
      '     doing nothing but arming the audio. */',
      '  if(!A.ctx||A.ctx.state!=="running"){ try{ audioEnsure(); }catch(e){} }');
    console.log('OK   audio graph built on load (BGM starts immediately)');
  }
}
/* call it at boot, right where the game already boots */
one('  renderProfiles();',
  [
    '  try{ audioEnsure(); }catch(e){}   /* BGM from the first frame, not the first tap */',
    '  renderProfiles();',
  ],
  'boot: audioEnsure at startup');

/* ===== 6. BACK BUTTON: start page only, game-themed =====
   The shell's own back button is a generic white circle and it is shown or
   hidden by the shell's 400ms poll. Same treatment as Connect Four: restyle it
   into the game's wood/cream palette, drive visibility from the game's own
   screen state (start page only) with !important rules so the shell's inline
   display cannot fight it, and give it the game's tap sound. */
{
  const i = find('const Panels={');
  if (i < 0) console.log('MISS Panels');
  else {
    lines.splice(i, 0,
      "/* The shell injects a generic white back button and toggles its display from",
      "   its own poll. On this warm wood board it reads as a sticker, so it is",
      "   repainted in the game's palette and made visible only on the START page,",
      "   driven from here rather than by the shell. !important so the shell's",
      "   inline display loses either way. */",
      'function themeShellBack(){',
      '  var b=window.__shellBackBtn;',
      '  if(!b||b.__woodThemed)return;',
      '  b.__woodThemed=true;',
      "  b.id='__carromBackWood';",
      "  b.style.cssText='position:fixed;z-index:9998;top:calc(12px + env(safe-area-inset-top));'+",
      "    'left:calc(12px + env(safe-area-inset-left));width:40px;height:40px;border-radius:50%;'+",
      "    'padding:0;margin:0;cursor:pointer;box-sizing:border-box;box-shadow:0 3px 8px rgba(0,0,0,.45);'+",
      "    \"font-family:'Baloo 2',Georgia,serif;font-size:25px;line-height:1;font-weight:800;\"+",
      "    'background:radial-gradient(circle at 35% 28%,#f0d9a8,#d8b877 55%,#b8934f);'+",
      "    'border:1px solid rgba(74,47,21,.55);color:#4A2F14;-webkit-tap-highlight-color:transparent;'+",
      "    'transition:transform .12s,box-shadow .12s';",
      '  var prev=b.onclick;',
      '  b.onclick=function(ev){',
      '    if(ev&&ev.preventDefault)ev.preventDefault();',
      "    try{ S('click'); Hap.tap(); }catch(e){}",
      '    if(prev){ prev(ev); return; }',
      '    try{ if(window.NativeBridge&&window.NativeBridge.exitGame)window.NativeBridge.exitGame(); }catch(_){}',
      '  };',
      '  try{',
      "    var st=document.createElement('style');",
      "    st.textContent='#__carromBackWood{display:none!important}'+",
      "      '#__carromBackWood.on{display:flex!important;align-items:center;justify-content:center;'+",
      "      'font-family:\\'Baloo 2\\',Georgia,serif;line-height:1;padding-bottom:2px}'+",
      "      '#__carromBackWood.on:active{transform:scale(.9)}';",
      '    (document.head||document.documentElement).appendChild(st);',
      '  }catch(e){}',
      '}',
      "setInterval(function(){",
      '  var b=window.__shellBackBtn;',
      '  if(!b)return;',
      '  themeShellBack();',
      "  var on=(window.__shellScreen==='home');",
      "  if(on===b.classList.contains('on'))return;",
      "  if(on)b.classList.add('on'); else b.classList.remove('on');",
      '},160);',
      '');
    console.log('OK   back button: game-themed, start page only');
  }
}

/* ===== 3. CONFIRMATION BEFORE THE THEME UNLOCK AD =====
   Tapping a locked theme went straight into the ad. Add a confirmation panel
   first, so the player sees what the ad is for and can back out. */
{
  const i = find("  if(window.__shellRewarded){window.__shellRewarded(\"carroms.theme.\"+id,give);}");
  if (i < 0) { console.log('MISS theme rewarded call'); }
  else {
    lines.splice(i, 1,
      "        confirmThemeAd(id,give);   /* ask first, then the rewarded ad */");
    console.log('OK   theme unlock asks for confirmation');
  }
}

/* markup for the confirmation panel, next to the other panels */
{
  const i = find('id="p-over"');
  const anchor = i < 0 ? find('id="p-theme"') : i;
  if (anchor < 0) { console.log('MISS panel anchor'); }
  else {
    /* find the end of that panel's section */
    let j = anchor;
    while (j < lines.length && !/^<\/div>\s*$/.test(lines[j])) j++;
    lines.splice(j + 1, 0,
      '',
      '<!-- theme unlock confirmation -->',
      '<section class="panel" id="p-adconfirm">',
      '  <div class="ptitle">UNLOCK THEME</div>',
      '  <div class="psub" id="adcfSub" style="margin-bottom:18px"></div>',
      '  <div class="adcf-art" id="adcfArt"></div>',
      '  <div class="adcf-note">A short video plays. The theme is yours for <b>2 hours</b> and works offline.</div>',
      '  <button class="btn primary" id="adcfYes" style="width:100%;margin-top:16px">WATCH AD &amp; UNLOCK</button>',
      '  <button class="btn sec" id="adcfNo" style="width:100%;margin-top:10px">NOT NOW</button>',
      '</section>',
      '');
    console.log('OK   confirmation panel markup');
  }
}

/* styles for it */
{
  const i = find('.panel.home{');
  if (i < 0) { console.log('MISS style anchor'); }
  else {
    lines.splice(i, 0,
      '/* --- theme unlock confirmation --- */',
      '.adcf-art{height:64px;width:64px;margin:0 auto 16px;border-radius:16px;',
      '  border:2px solid rgba(0,0,0,.22);box-shadow:0 6px 14px rgba(0,0,0,.25),inset 0 2px 0 rgba(255,255,255,.35)}',
      '.adcf-note{font-size:12px;line-height:1.5;color:var(--ink-soft);text-align:center;',
      '  background:rgba(0,0,0,.12);border:1px solid rgba(0,0,0,.14);border-radius:14px;padding:12px 14px}',
      '.adcf-note b{color:var(--ink)}',
      '#p-adconfirm{text-align:center;padding:26px 22px 22px}',
      '#p-adconfirm .btn{width:100%;margin-top:0}',
      '#adcfYes{margin-top:18px}',
      '');
    console.log('OK   confirmation panel styles');
  }
}

/* behaviour */
{
  const i = find('const Panels={');
  if (i < 0) { console.log('MISS Panels 2'); }
  else {
    lines.splice(i, 0,
      '/* Confirm before spending a view on the theme unlock ad. Holds the pending',
      '   theme and the grant, so the ad only fires on an explicit YES. */',
      'let _cfTheme=null,_cfGive=null;',
      'function confirmThemeAd(id,give){',
      '  const th=THEMES.find(t=>t.id===id);',
      "  $('#adcfSub').textContent='Watch an ad to unlock '+((th&&th.name)||'this theme')+' for 2 hours?';",
      "  const art=$('#adcfArt');",
      "  if(art&&th&&th.ui){",
      "    art.style.background='linear-gradient(160deg,'+th.ui.btn+','+th.ui.b2edge+')';",
      '  }',
      '  _cfTheme=id; _cfGive=give;',
      "  Panels.show('p-adconfirm');",
      '}',
      "function closeAdConfirm(){ _cfGive=null; _cfTheme=null; Panels.hide(); }",
      '');
    console.log('OK   confirmation behaviour');
  }
}

fs.writeFileSync(FILE, lines.join(NL));
const out = fs.readFileSync(FILE, 'utf8');
console.log('\nchecks:');
console.log('  confirm fn   :', /function confirmThemeAd/.test(out));
console.log('  panel markup :', /id="p-adconfirm"/.test(out));
console.log('  back themed  :', /__carromBackWood/.test(out));
console.log('  audio at boot:', /BGM from the first frame/.test(out));