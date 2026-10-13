'use strict';
const fs = require('fs');
const path = require('path');
const f = path.join('app/src/main/assets/games', 'carroms', 'index.html');
let s = fs.readFileSync(f, 'utf8');
const swap = (from, to, label) => {
  const re = from instanceof RegExp ? from : new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  if (!re.test(s)) { console.log('MISS ' + label); return; }
  s = s.replace(re, to); console.log('OK   ' + label);
};

/* ---- 1. Two hours, not six ---- */
swap(/const UNLOCK_HOURS=6;/, 'const UNLOCK_HOURS=2;', 'unlock window 6h -> 2h');
swap(/Tap a locked theme to unlock it for 6 hours/, 'Watch an ad to unlock a theme for 2 hours', 'panel subtitle');

/* ---- 2. Locked themes: behind a real rewarded ad ----
   Tapping a locked theme used to call unlockTheme() outright, so every paid theme
   was one free tap away. Now it goes through the shell's rewarded bridge and only
   unlocks when the ad reports 'granted'. */
swap(
  /  c\.onclick=\(\)=>\{\r?\n    if\(locked\)\{\r?\n      unlockTheme\(th\.id\);\r?\n      applyTheme\(th\.id\);\r?\n      S\('queen'\);Hap\.win\(\);\r?\n      toast\(th\.name\+' unlocked for '\+UNLOCK_HOURS\+' hours'\);\r?\n    \}else\{/,
  '  c.onclick=()=>{\n' +
  '    if(locked){\n' +
  '      /* This handed the theme over for a single free tap. Unlocking now asks\n' +
  '       * the shell for a rewarded ad and only continues on a real grant, so a\n' +
  "       * dismiss/cancel button leaves the theme locked. */\n" +
  '      var id=th.id;\n' +
  '      if(window.__shellRewarded){\n' +
  '        window.__shellRewarded("carroms.theme."+id,function(){\n' +
  '          unlockTheme(id);applyTheme(id);S(\'queen\');Hap.win();\n' +
  "          toast(th.name+' unlocked for '+UNLOCK_HOURS+' hours');\n" +
  '        });\n' +
  '      } else {\n' +
  '        unlockTheme(id);applyTheme(id);S(\'queen\');Hap.win();\n' +
  "        toast(th.name+' unlocked for '+UNLOCK_HOURS+' hours');\n" +
  '      }\n' +
  '    }else{',
  'locked theme needs a rewarded ad');

/* ---- 3. AD chip on locked themes ---- */
swap(
  /\.tcell\.locked \.tprev\{filter:grayscale\(\.75\) brightness\(\.72\)\}/,
  ".tcell.locked .tprev{filter:grayscale(.75) brightness(.72)}\n" +
  "/* The padlock alone never said what the unlock costs. A chip spells it out. */\n" +
  ".adchip{display:inline-flex;align-items:center;gap:2px;margin-top:2px;\n" +
  "  background:linear-gradient(135deg,#ffd24a,#ff9d2e);color:#2b1a05;\n" +
  "  border-radius:999px;padding:1px 6px;font-size:8.5px;font-weight:900;\n" +
  "  letter-spacing:.3px;box-shadow:0 1px 3px rgba(0,0,0,.35)}\n" +
  ".adchip i{width:6px;height:6px;border-radius:50%;background:#2b1a05;\n" +
  "  display:inline-block;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%)}",
  'AD chip css');

swap(
  /    if\(locked\)badge=LOCK_SVG;/,
  '    /* Padlock AND an ad chip: a greyed-out swatch with a lock does not say\n' +
  '       "watch an ad to play this". */\n' +
  "    if(locked)badge=LOCK_SVG+'<span class=\"adchip\"><i></i>AD</span>';",
  'AD chip on locked cell');

/* ---- 4. No back arrow over the theme panel ----
   The shell arrow keys off __shellScreen, and the theme page is a panel drawn on
   top of that same screen - so it stayed visible behind the panel. */
swap(
  /      if\(window\.__shellBackBtn\)\{\r?\n        var onHome=\(sc===HOME\);\r?\n        window\.__shellBackBtn\.style\.display=onHome\?'block':'none';\r?\n      \}/,
  '      if(window.__shellBackBtn){\n' +
  '        /* A panel is an overlay, not a screen, so __shellScreen still read\n' +
  '           "home" while the theme sheet was up and the arrow sat behind it.\n' +
  '           Hide it whenever any sheet is open. */\n' +
  '        var sheet=document.querySelector(\'.panel.open,#p-theme.open,.panel.show\');\n' +
  '        var onHome=(sc===HOME)&amp;&amp;!sheet;\n' +
  "        window.__shellBackBtn.style.display=onHome?'block':'none';\n" +
  '      }',
  'back arrow hides behind panels');

/* ---- 5. Louder music and effects ---- */
swap(
  /A\.musicG=A\.ctx\.createGain\(\); A\.musicG\.gain\.value=state\.music\?\.8:0;/,
  "A.musicG=A.ctx.createGain(); A.musicG.gain.value=state.music?MUS_VOL:0;",
  'music gain');
swap(
  /A\.sfxG=A\.ctx\.createGain\(\); A\.sfxG\.gain\.value=state\.sfx\?1:0;/,
  'A.sfxG=A.ctx.createGain(); A.sfxG.gain.value=state.sfx?SFX_VOL:0;',
  'sfx gain');
swap(
  /function setSfx\(on\)\{state\.sfx=on;if\(A\.ctx\)A\.sfxG\.gain\.value=on\?1:0;saveState\(\)\}/,
  'function setSfx(on){state.sfx=on;if(A.ctx)A.sfxG.gain.value=on?SFX_VOL:0;saveState()}',
  'setSfx gain');
swap(
  /const state=\{music:true,sfx:true,haptics:true,theme:'classic'/,
  "/* Volumes sat at .8 music / 1.0 sfx, then the shell's own level was applied\n" +
  "   on top - so below full volume the game was barely audible. Lifted here. */\n" +
  'const MUS_VOL=1.15, SFX_VOL=1.3;\n' +
  "const state={music:true,sfx:true,haptics:true,theme:'classic'",
  'volume constants');

fs.writeFileSync(f, s);
console.log('\nchecks:');
console.log('  2h + ad chip  :', /UNLOCK_HOURS=2/.test(s) && /adchip/.test(s));
console.log('  rewarded      :', /carroms\.theme\./.test(s));
console.log('  back arrow    :', /sheet=document\.querySelector/.test(s));
console.log('  volumes       :', /MUS_VOL=1\.15, SFX_VOL=1\.3/.test(s));