'use strict';
const fs = require('fs');
const path = require('path');
const f = path.join('app', 'src', 'main', 'assets', 'games', 'connect-four', 'index.html');
let s = fs.readFileSync(f, 'utf8');

const swap = (from, to, label) => {
  const re = from instanceof RegExp ? from : new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  if (!re.test(s)) { console.log('MISS ' + label); return; }
  s = s.replace(re, to); console.log('OK   ' + label);
};

/* ============ 1. LANDING LAG ============
   impact() ran on every bounce, and a single drop can bounce four times. Each
   pass fired navigator.vibrate(), a full spark+wood-dust+ring particle burst,
   and a four-oscillator clink routed through the convolver. So the moment the
   marble settled - the exact moment the eye is on it - the page was doing the
   most work it ever does: five vibrate IPCs and five particle storms. */
swap(
  /  spark\(X,Y,m\.p===1\?'rgba\(190,235,255,\.95\)':'rgba\(255,225,160,\.95\)',\r?\n    3\+Math\.round\(pow\*9\),\.5\+pow\);\r?\n  if\(pow>\.55\)woodDust\(X,Y,4\+Math\.round\(pow\*5\)\);\r?\n  ring\(X,Y,\(m\.p===1\?'rgba\(120,190,255,'\+'0\.6\)'\);/,
  "  /* The full burst belongs to the FIRST landing. Every later bounce was\n" +
  "     firing the same spark + wood-dust + ring set, so one drop could spray\n" +
  "     five bursts and shake the whole board five times as the marble settled. */\n" +
  "  const nf=first?1:.32;\n" +
  "  spark(X,Y,m.p===1?'rgba(190,235,255,.95)':'rgba(255,225,160,.95)',\n" +
  "    Math.max(1,Math.round((3+pow*9)*nf)),(.5+pow)*nf);\n" +
  "  if(first&&pow>.55)woodDust(X,Y,4+Math.round(pow*5));\n" +
  "  if(first)ring(X,Y,(m.p===1?'rgba(120,190,255,':'rgba(255,190,110,')+'0.6)');",
  'landing: full burst only on first contact');

swap(
  /  vibrate\(first\?Math\.round\(8\+pow\*14\):4\);/,
  "  /* navigator.vibrate() is an IPC into the system vibrator service, and this\n" +
  "     fired on every single bounce - up to five times inside one landing. That\n" +
  "     is very likely the bulk of the stutter. One buzz, on the first real\n" +
  "     contact, is enough to sell the hit. */\n" +
  '  if(first&&pow>.35) vibrate(Math.round(8+pow*14));',
  'landing: vibrate once, not five times');

swap(
  /if\(sp>m\.minv&&m\.b<4\)\{/,
  'if(sp>m.minv&&m.b<3){',
  'landing: 3 bounces not 4');

/* ============ 2. HOME BUTTON INTERSTITIAL ============ */
swap(
  /\$\('#btnHome'\)\.addEventListener\('click',\(\)=>\{SFX\.tap\(\);goIntro\(\);\}\);/,
  "$('#btnHome').addEventListener('click',()=>{\n" +
  '  SFX.tap();\n' +
  '  /* Leaving a game in progress. Returns to the start page once the ad closes. */\n' +
  "  shellAd(function(){ goIntro(); },'connectfour.home');\n" +
  '});',
  'home button shows an interstitial, then returns to start');

/* ============ 5. WIN: PANEL FIRST, AD IMMEDIATELY AFTER ============
   The ad was wrapping the call that SHOWS the plaque, so the order was
   ad -> wait 1050ms -> panel. The director wants the win panel first and the
   ad the instant after. */
swap(
  /  shellAd\(function\(\)\{ setTimeout\(function\(\)\{ if\(seq===S\.seq\)showPlaque\(m\.p\); \},1050\); \},'connectfour\.over\.win'\);/,
  '  /* Panel first, ad the instant after - not ad-then-panel. */\n' +
  '  setTimeout(function(){\n' +
  '    if(seq!==S.seq)return;\n' +
  '    showPlaque(m.p);\n' +
  "    setTimeout(function(){ shellAd(function(){},'connectfour.over.win'); },260);\n" +
  '  },1050);',
  'win: panel then ad');

swap(
  /  shellAd\(function\(\)\{ setTimeout\(function\(\)\{ if\(seq===S\.seq\)showPlaque\(0\); \},800\); \},'connectfour\.over\.draw'\);/,
  '  /* Same order as a win: panel first, ad immediately after. */\n' +
  '  setTimeout(function(){\n' +
  '    if(seq!==S.seq)return;\n' +
  '    showPlaque(0);\n' +
  "    setTimeout(function(){ shellAd(function(){},'connectfour.over.draw'); },260);\n" +
  '  },800);',
  'draw: panel then ad');

/* ============ 4. START-UP ANIMATION LAG ============
   resize() always ran buildIntroBG(), which paints a full-screen plank and
   then toDataURL('image/png') on it. closeIntro() calls resize() 50ms later -
   so every single time a match started, the app PNG-encoded a 1080x2400
   canvas. PNG encode of that size is hundreds of milliseconds, which is the
   stutter right as the board appears. */
swap(
  /  buildTable\(\);buildBoard\(\);buildIntroBG\(\);/,
  "  buildTable();buildBoard();\n" +
  "  /* closeIntro() calls resize() 50ms after hiding the start page, which was\n" +
  "     re-painting AND re-PNG-encoding a full-screen plank every time a match\n" +
  "     began. buildIntroBG() now no-ops while the start page is hidden. */\n" +
  '  buildIntroBG();',
  'resize comment');

swap(
  /function buildIntroBG\(\)\{\r?\n  const cn=document\.createElement\('canvas'\);/,
  'let _introBGKey="";\n' +
  'function buildIntroBG(){\n' +
  "  /* Skip entirely while the start page is hidden, and skip when the size has\n" +
  "     not changed since the last paint. This function used to run on every\n" +
  "     resize() and end in a toDataURL() of a full-screen canvas - the single\n" +
  '   * most expensive thing in the boot path. */\n' +
  "  if(introEl.classList.contains('off'))return;\n" +
  '  const key=vw+"x"+vh+"@"+dpr;\n' +
  '  if(key===_introBGKey)return;\n' +
  '  _introBGKey=key;\n' +
  "  const cn=document.createElement('canvas');",
  'buildIntroBG: skip when hidden, cache by size');

swap(
  /  introEl\.style\.backgroundImage='url\('\+cn\.toDataURL\('image\/png'\)\+\)';/,
  '  /* JPEG rather than PNG: a photographic plank texture gains nothing from a\n' +
  '     lossless encode, and toDataURL("image/jpeg") is several times faster. */\n' +
  "  introEl.style.backgroundImage='url('+cn.toDataURL('image/jpeg',0.9)+')';",
  'intro background: JPEG encode');

/* ============ 6. DROP SOUND: softer, rounder ============ */
swap(
  /    launch\(pan\)\{noise\(\{fc:1500,fe:4200,dur:\.07,vol:\.10,q:1\.2,pan:pan\|\|0,rev:\.2\}\);\},/,
  "    launch(pan){\n" +
  "      const p=pan||0;\n" +
  "      /* Was one bright noise sweep, 1.5kHz up to 4.2kHz at vol .10. Narrow-band\n" +
  "         and thin, it read as static rather than a marble leaving your finger.\n" +
  "         Replaced with a quieter, rounder release - a soft low-mid sweep plus\n" +
  '         a short body tone so it has weight instead of hiss. */\n' +
  "      noise({fc:820,fe:2100,dur:.06,vol:.05,q:.75,pan:p,rev:.12});\n" +
  "      tone({f:240,f2:150,dur:.055,vol:.045,type:'sine',pan:p});\n" +
  '    },',
  'drop sound: softer and rounder');

swap(
  /      noise\(\{fc:6800,dur:\.02,vol:\.09\*vol,q:1\.4,type:'highpass',pan,rev:\.3\}\);/,
  '      /* The 6.8kHz highpass tick was the harshest part of a drop - a scratch of\n' +
  '         very short noise over the top of the clink. Narrowed it and pulled it\n' +
  '         back so the strike reads as marble on wood. */\n' +
  "      noise({fc:5200,dur:.018,vol:.05*vol,q:1.1,type:'highpass',pan,rev:.22});",
  'clink: tame the high-frequency scratch');

fs.writeFileSync(f, s);
console.log('\nwritten');