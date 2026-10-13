'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join('app', 'src', 'main', 'assets', 'games', 'connect-four', 'index.html');
let s = fs.readFileSync(FILE, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
let lines = s.split(NL);

/* Replace from the first line matching startRe through the first later line
   matching endRe (inclusive). Everything is line-anchored because these blocks
   wrap in the source and hand-built regexes kept missing. */
function swap(startRe, endRe, replacement, label) {
  let i = -1;
  for (let k = 0; k < lines.length; k++) if (startRe.test(lines[k])) { i = k; break; }
  if (i < 0) { console.log('MISS start  ' + label); return false; }
  let j = i;
  while (j < lines.length && !endRe.test(lines[j])) j++;
  if (j >= lines.length) { console.log('MISS end    ' + label); return false; }
  lines.splice(i, j - i + 1, ...replacement);
  console.log('OK   ' + label);
  return true;
}

/* ---------- 1a. landing: one vibrate, not one per bounce ---------- */
swap(
  /^ {2}vibrate\(first\?Math\.round\(8\+pow\*14\):4\);$/,
  /^ {2}vibrate\(first\?Math\.round\(8\+pow\*14\):4\);$/,
  [
    '  /* navigator.vibrate() is an IPC into the system vibrator service, and this',
    '     fired on every single bounce - up to five times inside one landing, right',
    '     as the marble settled. One buzz on the first real contact is enough. */',
    '  if(first&&pow>.35) vibrate(Math.round(8+pow*14));',
  ],
  'landing: vibrate once, not five times');

/* ---------- 1b. landing: full particle burst only on first contact ---------- */
swap(
  /^ {2}spark\(X,Y,m\.p===1\?/,
  /^ {2}ring\(X,Y,\(m\.p===1\?/,
  [
    '  /* The full burst belongs to the FIRST landing. Every later bounce fired the',
    '     same spark + wood-dust + ring set, so one drop sprayed five bursts and',
    '     jolted the board five times as the marble came to rest. */',
    '  const nf=first?1:.32;',
    "  spark(X,Y,m.p===1?'rgba(190,235,255,.95)':'rgba(255,225,160,.95)',",
    '    Math.max(1,Math.round((3+pow*9)*nf)),(.5+pow)*nf);',
    '  if(first&&pow>.55)woodDust(X,Y,4+Math.round(pow*5));',
    "  if(first)ring(X,Y,(m.p===1?'rgba(120,190,255,':'rgba(255,190,110,')+'0.6)');",
  ],
  'landing: full burst only on first contact');

/* ---------- 1c. fewer bounces ---------- */
swap(
  /^ {12}if\(sp>m\.minv&&m\.b<4\)\{$/,
  /^ {12}if\(sp>m\.minv&&m\.b<4\)\{$/,
  [
    '          if(sp>m.minv&&m.b<3){',
  ],
  'landing: 3 bounces not 4');

/* ---------- 2 + 7. home button: interstitial, then back to the start page ---------- */
swap(
  /^ \$\('#btnHome'\)\.addEventListener/,
  /^ \$\('#btnHome'\)\.addEventListener/,
  [
    " $('#btnHome').addEventListener('click',()=>{",
    '   SFX.tap();',
    '   /* Leaving a game in progress: interstitial, then the start page. */',
    "   shellAd(function(){ goIntro(); },'connectfour.home');",
    ' });',
  ],
  'home button: interstitial then start page');

/* ---------- 5. win: panel first, ad the instant after ---------- */
swap(
  /^ {2}\/\* A finished match\. \*\/$/,
  /^ {2}shellAd\(function\(\)\{ setTimeout\(\(\)=>\{/,
  [
    '  /* Panel first, ad the instant after - not ad-then-panel. */',
    '  setTimeout(()=>{',
    '    if(seq!==S.seq)return;',
    '    showPlaque(m.p);',
    "    setTimeout(()=>{ shellAd(()=>{},'connectfour.over.win'); },260);",
    '  },1050);',
  ],
  'win: panel then ad');

swap(
  /^ {2}\/\* A finished match\. \*\/$/,
  /^ {2}shellAd\(function\(\)\{ setTimeout\(\(\)=>\{/,
  [
    '  /* Same order as a win: panel first, ad immediately after. */',
    '  setTimeout(()=>{',
    '    if(seq!==S.seq)return;',
    '    showPlaque(0);',
    "    setTimeout(()=>{ shellAd(()=>{},'connectfour.over.draw'); },260);",
    '  },800);',
  ],
  'draw: panel then ad');

/* ---------- 4. start-up animation: stop PNG-encoding the screen every start ---------- */
swap(
  /^function buildIntroBG\(\)\{$/,
  /^function buildIntroBG\(\)\{$/,
  [
    'let _introBGKey="";',
    'function buildIntroBG(){',
    '  /* closeIntro() calls resize() 50ms after hiding the start page, and resize()',
    '     always ran buildIntroBG() - which paints a full-screen plank and then',
    '     toDataURL()s it. So every time a match began, the app was PNG-encoding a',
    '     1080x2400 canvas: hundreds of milliseconds of jank right as the board',
    '     appears. Skip while hidden, and skip when the size has not changed. */',
    "  if(introEl.classList.contains('off'))return;",
    '  const key=vw+"x"+vh+"@"+dpr;',
    '  if(key===_introBGKey)return;',
    '  _introBGKey=key;',
  ],
  'buildIntroBG: skip when hidden, cache by size');

swap(
  /^ {2}introEl\.style\.backgroundImage='url\('\+cn\.toDataURL\('image\/png'\)\+\)';$/,
  /^ {2}introEl\.style\.backgroundImage='url\('\+cn\.toDataURL\('image\/png'\)\+\)';$/,
  [
    '  /* JPEG not PNG: a painted plank gains nothing from lossless, and the JPEG',
    '     encode of the same canvas is several times faster. */',
    "  introEl.style.backgroundImage='url('+cn.toDataURL('image/jpeg',0.9)+')';",
  ],
  'intro background: JPEG encode');

/* ---------- 6. drop sound: softer, rounder ---------- */
swap(
  /^ {4}launch\(pan\)\{noise\(/,
  /^ {4}launch\(pan\)\{noise\(/,
  [
    '    launch(pan){',
    '      const p=pan||0;',
    '      /* Was one narrow noise sweep, 1.5kHz up to 4.2kHz at vol .10 - thin and',
    '         hissy, more like static than a marble leaving your finger. Replaced with',
    '         a quieter, rounder release: a soft low-mid sweep plus a short body tone',
    '         so it has weight instead of hiss. */',
    "      noise({fc:820,fe:2100,dur:.06,vol:.05,q:.75,pan:p,rev:.12});",
    "      tone({f:240,f2:150,dur:.055,vol:.045,type:'sine',pan:p});",
    '    },',
  ],
  'drop sound: softer and rounder');

swap(
  /^ {6}noise\(\{fc:6800,dur:\.02,vol:\.09\*vol,q:1\.4,type:'highpass',pan,rev:\.3\}\);$/,
  /^ {6}noise\(\{fc:6800,dur:\.02,vol:\.09\*vol,q:1\.4,type:'highpass',pan,rev:\.3\}\);$/,
  [
    '      /* The 6.8kHz highpass tick was the harshest part of a drop - a scratch of',
    '         very short noise over the clink. Narrowed and pulled back so the strike',
    '         reads as marble on wood. */',
    "      noise({fc:5200,dur:.018,vol:.05*vol,q:1.1,type:'highpass',pan,rev:.22});",
  ],
  'clink: tame the high-frequency scratch');

/* ---------- 3. back button: wood theme + game tap sound ---------- */
let at = -1;
for (let k = 0; k < lines.length; k++) if (/^function refreshUI\(\)\{/.test(lines[k])) { at = k; break; }
if (at < 0) console.log('MISS  back button (no refreshUI anchor)');
else {
  lines.splice(at, 0,
    '/* The shell injects its own back button: a plain white circle with a chevron,',
    "   sized for a generic light game. On this dark walnut board it read as a sticker",
    '   laid over the art, and it exited silently while every other control in the game',
    "   makes a sound. Repaint it in the game's own .barbtn wood treatment and give it",
    '   the game tap - wrapping the shell handler rather than replacing it, so it still',
    '   exits. */',
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
    "    st.textContent='#__shellBackWood:active{transform:scale(.88)}';",
    '    (document.head||document.documentElement).appendChild(st);',
    '  }catch(e){}',
    '}',
    '/* The shell block runs after this one, so the button does not exist on the first',
    '   pass. Poll briefly until it appears, then leave it alone. */',
    'var _woodPoll=0;',
    'var _woodTimer=setInterval(function(){',
    '  themeShellBack();',
    '  if(window.__shellBackBtn||++_woodPoll>40){ clearInterval(_woodTimer); }',
    '},100);',
    '');
  console.log('OK   back button: wood theme + tap sound');
}

fs.writeFileSync(FILE, lines.join(NL));
console.log('\nwritten (' + lines.length + ' lines)');