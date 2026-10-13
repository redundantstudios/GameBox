'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join('app', 'src', 'main', 'assets', 'games', 'carroms', 'index.html');
let s = fs.readFileSync(FILE, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
const lines = s.split(NL);

/* Content-anchored: from the adcfYes handler to the adcfNo handler inclusive. */
const start = lines.findIndex(l => l.includes("$('#adcfYes').onclick=()=>{"));
if (start < 0) { console.log('MISS start'); process.exit(1); }
const end = lines.findIndex((l, k) => k > start && l.includes("$('#adcfNo').onclick="));
if (end < 0) { console.log('MISS end'); process.exit(1); }

const block = [
  " $('#adcfYes').onclick=()=>{",
  '   const give=_cfGive,themeId=_cfTheme;',
  '   const th=THEMES.find(t=>t.id===themeId);',
  '   _cfGive=null; _cfTheme=null;',
  '   /* Dismiss the sheet, but NOT to the start page: the overlay stays alive so',
  '     the theme page can come back once the ad reports. Previously the sheet was',
  '     closed up front, so finishing the ad dropped the player on the bare start',
  '     page with no indication anything had changed. */',
  '   Panels.hide();',
  '   const landed=function(){',
  "     Panels.show('p-theme'); buildThemeGrid();",
  "     toast(((th&&th.name)||'Theme')+' applied');",
  '   };',
  '   if(window.__shellRewarded&&give){',
  "     window.__shellRewarded('carroms.theme.'+themeId,function(){ give(); landed(); });",
  '   } else if(give){ give(); landed(); }',
  ' };',
  " $('#adcfNo').onclick=()=>{ S('close'); closeAdConfirm(); };",
];
lines.splice(start, end - start + 1, ...block);
fs.writeFileSync(FILE, lines.join(NL));

const out = fs.readFileSync(FILE, 'utf8');
console.log('OK   adcfYes/adcfNo rewritten (lines ' + (start + 1) + '-' + (end + 1) + ')');
console.log('  landed fn   :', /const landed=function\(\)/.test(out));
console.log('  names theme :', /' applied'\)/.test(out));
console.log('  one handler :', (out.match(/adcfYes'\)\.(onclick|addEventListener)/g) || []).length === 1);
console.log('  to settings :', /Panels\.show\('p-settings'\)/.test(out));