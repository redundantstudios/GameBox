'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join('app', 'src', 'main', 'assets', 'games', 'connect-four', 'index.html');
let s = fs.readFileSync(FILE, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
let lines = s.split(NL);

const i = lines.findIndex(l => l.includes('function showIntro(){'));
if (i < 0) { console.log('MISS showIntro'); process.exit(1); }
let j = i;
while (j < lines.length && !lines[j].includes('shellScreen("home");')) j++;
if (j >= lines.length) { console.log('MISS showIntro body'); process.exit(1); }

lines.splice(j + 1, 0,
  '',
  '  /* Return to the MAIN start page. This never reset which pane was showing,',
  '     so leaving mid-game after PLAY put you back on the opponent/skill setup',
  '     rather than the start page - the thing MENU and HOME are supposed to',
  '     return you to. */',
  "  switchView('ipMain');");

s = lines.join(NL);
fs.writeFileSync(FILE, s);
console.log('OK   showIntro returns to the main start page');
console.log('  verify:', /switchView\('ipMain'\);/.test(s));