'use strict';
const fs = require('fs');
const path = require('path');
const f = path.join('app/src/main/assets/games', 'truth-or-dare', 'index.html');
let s = fs.readFileSync(f, 'utf8');
const swap = (from, to, label) => {
  const re = from instanceof RegExp ? from : new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  if (!re.test(s)) { console.log('MISS ' + label); return; }
  s = s.replace(re, to); console.log('OK   ' + label);
};

/* ---- 1. LOCKED MODES EXPIRE AFTER AN HOUR, NOT FOREVER ---- */
swap(
  /function tierUnlocked\(t\)\{ return t==='mild' \|\| t==='free' \|\| state\.unlocked\[t\]; \}/,
  "/* These used to be plain booleans, so one ad bought SPICY and FIRE for good\n" +
  "   ('UNLOCKED FOREVER'). They now hold an expiry timestamp. Older saves that\n" +
  "   stored a bare true are still honoured as permanent rather than locking a\n" +
  "   mode somebody already paid to open. */\n" +
  "const TIER_MS=3600*1000;\n" +
  "function tierUnlocked(t){\n" +
  "  if(t==='mild'||t==='free') return true;\n" +
  "  const u=state.unlocked[t];\n" +
  "  if(!u) return false;\n" +
  "  if(typeof u==='boolean') return u;\n" +
  "  return u>Date.now();\n" +
  "}\n" +
  "function tierMinsLeft(t){\n" +
  "  const u=state.unlocked[t];\n" +
  "  if(!u||typeof u==='boolean') return 0;\n" +
  "  return Math.max(0,Math.ceil((u-Date.now())/60000));\n" +
  "}",
  'tier unlock expires in 1h');

swap(
  /    state\.unlocked\[t\]=true; state\.spice=t; state\.decks=\{\};\r?\n    syncSpice\(\); save\(\); closeAll\(\);\r?\n    toast\(SPICE_META\[t\]\.label\+' UNLOCKED FOREVER'\);/,
  "    state.unlocked[t]=Date.now()+TIER_MS; state.spice=t; state.decks={};\n" +
  "    syncSpice(); save(); closeAll();\n" +
  "    toast(SPICE_META[t].label+' UNLOCKED FOR 1 HOUR');",
  'unlock grants 1 hour');

/* The description line should say how long is left, not just "ACTIVE". */
swap(
  /    desc\.textContent = !un \? 'LOCKED · TAP TO UNLOCK'\r?\n      : \(t===state\.spice \? 'ACTIVE' : SPICE_META\[t\]\.desc\);/,
  "    let d = !un ? 'LOCKED · WATCH AN AD · 1 HOUR'\n" +
  "          : (t===state.spice ? 'ACTIVE' : SPICE_META[t].desc);\n" +
  "    if(un && tierMinsLeft(t)>0) d='ACTIVE · '+tierMinsLeft(t)+'M LEFT';\n" +
  '    desc.textContent=d;',
  'timer shown on tier');

/* The unlock sheet promised a permanent unlock. */
swap(/<b>Flirty · one ad to unlock<\/b>/, '<b>Flirty · one ad · 1 hour</b>', 'copy spicy');
swap(/<b>Bold · one ad to unlock<\/b>/, '<b>Bold · one ad · 1 hour</b>', 'copy fire');
swap(/Unlock is permanent and works offline/, 'Unlock lasts one hour and works offline', 'copy note');

/* If a mode lapsed while the app was shut, fall back rather than starting in it. */
swap(
  /if\(d\.unlocked\) state\.unlocked=d\.unlocked;/,
  "if(d.unlocked) state.unlocked=d.unlocked;\n" +
  "  /* A mode can lapse between sessions - do not drop the player into a\n" +
  "     locked tier on the next launch. */\n" +
  "  if(state.spice&&state.spice!=='mild'&&state.spice!=='free'&&!tierUnlocked(state.spice)){\n" +
  "    state.spice='mild'; state.decks={};\n" +
  "  }",
  'expired mode falls back');

/* ---- 2. THE SETUP PAGE COULD NOT SCROLL PAST A CERTAIN PLAYER COUNT ----
   #pList just kept growing inside a fixed page, so past roughly six players the
   controls below it went off-screen with nothing to scroll them back. */
swap(
  /#pList\{/,
  "/* The player list grows without bound. Without its own scroll it pushed the\n" +
  "   rest of setup off the bottom of the screen and the page itself did not\n" +
  "   scroll, so once you passed a handful of players the controls below became\n" +
  "   unreachable. Scrolls here instead. */\n" +
  "#pList{max-height:min(34vh,230px);overflow-y:auto;-webkit-overflow-scrolling:touch;\n" +
  "  padding-right:2px;scrollbar-width:thin}\n" +
  "#pList{",
  'pList scrolls');

fs.writeFileSync(f, s);
console.log('\nchecks:');
console.log('  1h expiry  :', /TIER_MS=3600\*1000/.test(s));
console.log('  not forever:', /UNLOCKED FOR 1 HOUR/.test(s));
console.log('  scroll     :', /#pList\{max-height:min\(34vh/.test(s));