'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/carroms/index.html';
let s = fs.readFileSync(f, 'utf8');
const from = "$('#bPauseHome').onclick=()=>showHome();";
const to = "$('#bPauseHome').onclick=()=>window.__shellAd(function(){showHome();},'carroms.pause.home');";
if (!s.includes(from)) { console.log('MISS pause HOME'); process.exit(1); }
s = s.split(from).join(to);
fs.writeFileSync(f, s);
console.log('OK   carroms: pause HOME');
console.log('resume left ad-free:', s.includes("$('#bResume').onclick=()=>Panels.hide();"));