'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join('app', 'src', 'main', 'assets', 'games', 'carroms', 'index.html');
let s = fs.readFileSync(FILE, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
let lines = s.split(NL);

const i = lines.findIndex(l => l.includes("$('#bPlay').onclick="));
if (i < 0) { console.log('MISS menu wiring'); process.exit(1); }

lines.splice(i, 0,
  " /* theme unlock confirmation: the ad only runs on an explicit YES */",
  " $('#adcfYes').onclick=()=>{",
  "   const give=_cfGive;",
  '   closeAdConfirm();',
  "   if(window.__shellRewarded&&give){ window.__shellRewarded('carroms.theme.'+_cfTheme,give); }",
  '   else if(give){ give(); }',
  ' };',
  " $('#adcfNo').onclick=()=>{ S('close'); closeAdConfirm(); };",
  '');

fs.writeFileSync(FILE, lines.join(NL));
const out = fs.readFileSync(FILE, 'utf8');
console.log('OK   confirmation buttons wired');
console.log('  verify:', /adcfYes/.test(out) && /adcfNo/.test(out));