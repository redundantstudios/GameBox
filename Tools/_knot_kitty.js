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

/* ---- HINTS AND UNDOS WERE REFUNDED EVERY LEVEL ----
   Both startLevel() and restartLevel() did
       G.undoLeft = G.hintLeft = G.levelData.uses
   so the kit topped itself back up on every level start, and on every retry. Any
   use - paid for or not - was wiped by moving on, and retrying a level was a way
   to farm hints and undos for free. They are now a kit: granted once when a run
   starts, carried across levels, topped up by a rewarded ad, and restored to the
   level's starting figure on a retry so restarting cannot mint more. */

swap(/undoLeft:1,hintLeft:1\};/, 'undoLeft:1,hintLeft:1,kitGranted:false,undoSnap:1,hintSnap:1};', 'kitty state');

swap(
  /G\.undoLeft=G\.levelData\.uses;G\.hintLeft=G\.levelData\.uses;\r?\n  tweens\.clear\(\);/,
  '/* Granted once, at the very start of a run, then carried - see newRun(). */\n' +
  '  if(!G.kitGranted){G.undoLeft=G.levelData.uses;G.hintLeft=G.levelData.uses;G.kitGranted=true;}\n' +
  '  /* Snapshot for retry: a restart restores this level\'s starting figure\n' +
  '     rather than the level allowance, so retrying cannot be farmed. */\n' +
  '  G.undoSnap=G.undoLeft;G.hintSnap=G.hintLeft;\n' +
  '  tweens.clear();',
  'startLevel no longer refills the kit');

swap(
  /G\.undoLeft=G\.levelData\.uses;G\.hintLeft=G\.levelData\.uses;\r?\n  updateHud\(\);/,
  "G.undoLeft=G.undoSnap;G.hintLeft=G.hintSnap;\n  updateHud();",
  'restartLevel restores the snapshot');

/* A fresh run re-arms the one-time grant. */
swap(
  /function restartLevel\(\)\{/,
  "/* Starting a fresh run from the level select: clear the one-time grant so the\n" +
  "   kit is handed out again, and drop the per-level snapshot. Called just\n" +
  "   before startLevel on the way in from the menu. */\n" +
  "function newRun(){ G.kitGranted=false; }\n" +
  "function restartLevel(){",
  'newRun helper');

swap(
  /AudioSys\.sfx\('click'\);haptic\(6\);startLevel\(i\);/,
  "AudioSys.sfx('click');haptic(6);newRun();startLevel(i);",
  'level select starts a fresh run');

fs.writeFileSync(f, s);
console.log('\nchecks:');
console.log('  no per-level refill :', !/G\.undoLeft=G\.levelData\.uses/.test(s));
console.log('  snapshot            :', /G\.undoSnap=G\.undoLeft/.test(s));
console.log('  newRun              :', /function newRun\(\)/.test(s));