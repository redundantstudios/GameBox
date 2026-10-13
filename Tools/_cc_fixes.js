'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/chinese-checkers/index.html';
let s = fs.readFileSync(f, 'utf8');
const before = s;

const swap = (from, to, label) => {
  if (from instanceof RegExp) {
    if (!from.test(s)) { console.log('MISS ' + label); return; }
    s = s.replace(from, to); console.log('OK   ' + label); return;
  }
  if (!s.includes(from)) { console.log('MISS ' + label); return; }
  s = s.replace(from, to); console.log('OK   ' + label);
};

/* ---- 1. The 6 PLAYER tile ----
   The shell's N-player grid is built from every game's own min..max range, so
   declaring maxPlayers 6 conjured a 6 PLAYER tile on the home page - a tile for
   a player count nothing else offers. Capped at 5. */
swap(/maxPlayers: 6/, 'maxPlayers: 5', 'manifest capped at 5 players');

/* ---- 2. RESET DATA ----
   It cleared sound and haptics, which the shell owns now. What is left is a
   progress wipe dressed as a settings button, sitting in Settings where a
   player would not expect to lose their games. */
swap(/ *<button id="btnReset"[\s\S]*?<\/button>\r?\n/, '', 'RESET DATA removed');
swap(
  /\$\('btnReset'\)\.onclick=\(\)=>\{[\s\S]*?refreshHome\(\);toast\('DATA CLEARED'\)\};\r?\n/,
  '',
  'RESET DATA handler removed');

/* ---- 3. Volume ----
   The shell sends `vol` as an Int on a 0-100 scale, not a 0-1 fraction. Clamping
   it as a fraction collapsed every value to 1 or 0 - and a player whose slider
   sat at 0 got genuine silence, taps and gameplay sounds alike. */
swap(
  /let GAME_VOL=Q\.has\('vol'\)\?clamp\(parseFloat\(Q\.get\('vol'\)\)\|\|0,0,1\):0\.8;/,
  "/* `vol` arrives on the shell's 0-100 scale. */\n" +
  "let GAME_VOL=Q.has('vol')?clamp((parseFloat(Q.get('vol'))||0)/100,0,1):0.8;",
  'volume scale fixed');
swap(
  /if\(typeof st\.volume==='number'\)GAME_VOL=Math\.max\(0,Math\.min\(1,st\.volume\)\);/,
  "if(typeof st.volume==='number')GAME_VOL=clamp(st.volume>1?st.volume/100:st.volume,0,1);",
  'pushed volume scale fixed');

/* ---- 4. No auto path for this game ---- */
swap(
  /\n  \/\* AUTO PATH FROM THE PLAYER COUNT[\s\S]*?\n  \}\n/,
  '\n',
  'auto path removed');

/* ---- 5. Banner: game page only, and reliable ----
   The old predicate mixed && and || across three clauses without brackets, so
   it did not mean what it read like - and it only re-ran on a tap, meaning the
   strip could stay up over the pause sheet or the win plaque. The states are
   now explicit and the banner is set wherever the screen actually changes. */
swap(
  /  var bOn=false;\r?\n  function syncBanner\(\)\{[\s\S]*?\r?\n  \}\r?\n  function currentScreenIsGame\(\)\{[\s\S]*?\r?\n  \}/,
  '  var bOn=false;\n' +
  '  /* True only while a board is actually being played. Every clause is\n' +
  '     parenthesised on purpose - the previous version chained && and ||\n' +
  '     across three conditions without brackets and did not evaluate the way\n' +
  '     it read. */\n' +
  '  function onGamePage(){\n' +
  '    if(!G)return false;\n' +
  "    if(G.phase==='over')return false;\n" +
  '    if(G.paused)return false;\n' +
  '    if(tut.on)return false;\n' +
  "    if(!$('scrHome').classList.contains('hidden'))return false;\n" +
  "    if(!$('scrSetup').classList.contains('hidden'))return false;\n" +
  "    if(!$('ovPause').classList.contains('hidden'))return false;\n" +
  "    if(!$('ovWin').classList.contains('hidden'))return false;\n" +
  '    return true;\n' +
  '  }\n' +
  '  function syncBanner(){\n' +
  '    var on=onGamePage();\n' +
  '    if(on===bOn)return;\n' +
  '    bOn=on;\n' +
  '    banner(on);\n' +
  '  }',
  'banner predicate');

fs.writeFileSync(f, s);

const checks = {
  'maxPlayers 5': /maxPlayers: 5/.test(s),
  'no RESET DATA': !/btnReset/.test(s),
  'volume 0-100': /\/100,0,1\):0\.8;/.test(s),
  'no auto path': !/function autoPath/.test(s),
  'banner predicate explicit': /function onGamePage\(\)/.test(s),
  'no old predicate': !/currentScreenIsGame/.test(s),
};
Object.entries(checks).forEach(([k, v]) => console.log((v ? 'OK   ' : 'MISS ') + k));
console.log('changed:', s !== before);