'use strict';
const fs = require('fs');
const path = require('path');
const f = path.join('app/src/main/assets/games', 'knot-away', 'index.html');
let s = fs.readFileSync(f, 'utf8');
const swap = (from, to, label) => {
  const re = from instanceof RegExp ? from : new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  if (!re.test(s)) { console.log('MISS ' + label); return; }
  s = s.replace(re, to); console.log('OK   ' + label);
};

/* openPanel/closePanels are the single choke point for every sheet - pause,
   game over, level complete and the reward offer all go through them. The game
   defined __shellBlock and then never called it, so the banner sat on screen
   behind all of them instead of only during active play. */
swap(
  /  \$\('#panel-'\+name\)\.classList\.add\('on'\);\r?\n\}/,
  "  $('#panel-'+name).classList.add('on');\n" +
  '  /* A sheet is not the game page. */\n' +
  '  try{ if(window.__shellBlock) window.__shellBlock(true); }catch(e){}\n' +
  '}',
  'openPanel hides the banner');

swap(
  /  \$\('#overlay'\)\.classList\.remove\('show'\);\r?\n  document\.querySelectorAll\('\.panel'\)\.forEach\(p=>p\.classList\.remove\('on'\)\);\r?\n\}/,
  "  $('#overlay').classList.remove('show');\n" +
  "  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('on'));\n" +
  '  try{ if(window.__shellBlock) window.__shellBlock(false); }catch(e){}\n' +
  '}',
  'closePanels restores the banner');

fs.writeFileSync(f, s);
console.log('\nchecks:');
console.log('  open blocks :', /__shellBlock\(true\)/.test(s));
console.log('  close unblocks:', /__shellBlock\(false\)/.test(s));