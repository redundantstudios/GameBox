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

/* ===== 1. BGM SILENT UNTIL SOMETHING IS TAPPED =====
   audioEnsure() was only ever called from the pointerdown listener, so the graph
   was built on the first touch and the BGM sat silent until then. The earlier
   fix put a call in the SETUP flow rather than at boot, so it never ran on the
   start page. Build it right here, at the end of boot, after the theme and
   switches are in place so the correct volume is applied on the first frame. */
one('showHome();',
  [
    '  /* Build the audio graph now, not on the first tap: the shell lifts the',
    '     autoplay gesture gate, so the BGM can start with the game. Previously the',
    "     only call was inside the pointerdown listener, so nothing was audible",
    '     until the player touched something. */',
    '  try{ audioEnsure(); }catch(e){}',
    'showHome();',
  ],
  'BGM starts at boot');

/* ===== 2. AFTER THE THEME AD: STAY ON THE THEME PAGE, AND SAY SO =====
   closeAdConfirm() ran before the ad, which hid the whole overlay - so when the
   ad finished the player landed on the bare start page with no idea the theme
   had changed. Now the ad is left showing behind the ad, the theme grid is
   rebuilt so the new theme shows as selected, a toast confirms it, and the
   theme page's BACK returns to Settings rather than to the start page. */
one("        confirmThemeAd(id,give);   /* ask first, then the rewarded ad */",
  [
    '        confirmThemeAd(id,give);   /* ask first, then the rewarded ad */',
  ],
  'confirm entry unchanged');

/* give(): rebuild the grid, toast, and stay put */
one("        var give=function(){unlockTheme(id);applyTheme(id);S('queen');Hap.win();",
  [
    '        var give=function(){unlockTheme(id);applyTheme(id);S(\'queen\');Hap.win();',
    '          /* Stay on the theme page and confirm what changed. Without this the',
    '             ad simply dropped the player on the bare start page. */',
    '          buildThemeGrid();',
  ],
  'theme applied rebuilds the grid');

/* the confirmation must not tear the overlay down before the ad */
one('  _cfTheme=id; _cfGive=give;',
  [
    "  _cfTheme=id; _cfGive=give;",
  ],
  'state set');
one("  if(window.__shellRewarded&&give){ window.__shellRewarded('carroms.theme.'+_cfTheme,give); }",
  [
    "  if(window.__shellRewarded&&give){ window.__shellRewarded('carroms.theme.'+_cfTheme,give); }",
  ],
  'ad entry unchanged');
one('function closeAdConfirm(){ _cfGive=null; _cfTheme=null; Panels.hide(); }',
  [
    '/* Cancelling closes the sheet and returns to SETTINGS, not the start page: the',
    '   player opened Themes from there and should come back to it. */',
    "function closeAdConfirm(){ _cfGive=null; _cfTheme=null; Panels.show('p-settings'); }",
  ],
  'cancel returns to settings');

/* toast + reopen the theme page after the ad */
one(" $('#adcfNo').onclick=()=>{ S('close'); closeAdConfirm(); };",
  [
    " $('#adcfNo').onclick=()=>{ S('close'); closeAdConfirm(); };",
    " /* After a successful unlock the sheet closes and the THEME page comes back,",
    "    with a toast naming the theme. Without these the player was dumped on the",
    '    bare start page and never learned the ad had done anything. */',
    " $('#adcfYes').addEventListener('click',function(){",
    '   setTimeout(function(){',
    "     if(!_cfGive){ Panels.show('p-theme'); buildThemeGrid(); }",
    "     else { _cfGive=null; _cfTheme=null; Panels.show('p-theme'); buildThemeGrid();",
    "            toast('Theme applied'); }",
    '   },0);',
    ' });',
  ],
  'after unlock: theme page + toast');

/* the theme page BACK should go to settings */
{
  const i = find("$('#bTheme').onclick=");
  if (i < 0) { console.log('MISS bTheme'); }
  else {
    lines.splice(i + 1, 0,
      " /* Back out of Themes goes to Settings - that is where it was opened from.",
      "    A bare Panels.hide() dropped the player straight onto the start page. */",
      " document.querySelectorAll('#p-theme .backbtn,#p-theme .btn.sec').forEach(b=>{",
      "   b.addEventListener('click',()=>{ Panels.show('p-settings'); });",
      ' });');
    console.log('OK   theme BACK returns to settings');
  }
}

fs.writeFileSync(FILE, lines.join(NL));
const out = fs.readFileSync(FILE, 'utf8');
console.log('\nchecks:');
console.log('  boot audio :', /Build the audio graph now, not on the first tap/.test(out));
console.log('  theme page :', /Panels\.show\('p-theme'\)/.test(out));
console.log('  toast      :', /toast\('Theme applied'\)/.test(out));
console.log('  back chain :', /Panels\.show\('p-settings'\)/.test(out));