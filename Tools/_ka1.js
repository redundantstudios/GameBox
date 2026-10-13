'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join('app', 'src', 'main', 'assets', 'games', 'knot-away', 'index.html');
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
   The earlier "arm the audio at boot" call was written INSIDE the pause -> home
   ad callback, so it only ever ran after leaving a game that way. The graph was
   still built from a pointerdown listener, so nothing was audible until the
   player touched something. */
one("on('#btnPauseHome',()=>{closePanels();window.__shellAd(function(){showScreen('home');",
  [
    "on('#btnPauseHome',()=>{closePanels();window.__shellAd(function(){showScreen('home');},'knotaway.pause.home');});",
  ],
  'removed the misplaced audio call');
/* drop the three orphaned lines that followed it */
{
  const i = find('* can actually make sound - leaving it to unlock() meant the game opened');
  if (i < 0) console.log('MISS orphan audio lines');
  else {
    lines.splice(i - 1, 4);   /* the comment opener + 3 lines */
    console.log('OK   removed orphaned audio comment block');
  }
}

/* build the graph at boot */
one("document.addEventListener('pointerdown',()=>{",
  [
    "/* Build the audio graph and start the music on load, not on the first tap.",
    "   The shell lifts Chromium's autoplay gesture gate, so this can actually",
    "   make sound. The pointerdown listener below is kept as a harmless retry. */",
    "try{ if(AudioSys.unlock()&&save.settings.music)AudioSys.startMusic(); }catch(e){}",
    "document.addEventListener('pointerdown',()=>{",
  ],
  'BGM starts at boot');

/* ===== 6. THE PAUSE SHEET SURVIVES GOING HOME =====
   Every home route called closePanels() and then showScreen('home') - but the
   ad callback runs LATER, and showScreen() never closed the overlay itself, so
   any sheet opened in between (or left open by the visibilitychange handler)
   stayed on top of the start page. */
one("function showScreen(name){",
  [
    "function showScreen(name){",
    "  /* Leaving the table tears down any sheet. showScreen() is the single",
    "     funnel for every route out of a game, and it did not close the overlay,",
    "     so the pause sheet could outlive the game and sit on the start page. */",
    "  if(name!=='game'){ try{ closePanels(); }catch(e){} }",
  ],
  'showScreen closes any sheet when leaving the game');

/* ===== 4. HINTS AND UNDOS MUST PERSIST =====
   They lived on the per-run G object, so they were rebuilt from scratch every
   session and never saved. Now they live in the save file, start at 2 each,
   only go down when actually used, and are topped up by a rewarded ad. */
one('undoLeft:1,hintLeft:1,kitGranted:false,undoSnap:1,hintSnap:1};',
  [
    "undoLeft:0,hintLeft:0,kitGranted:true,undoSnap:0,hintSnap:0};",
    "/* The kit is NOT on the run state any more - see kit() below. G.undoLeft /",
    "   G.hintLeft are re-seeded from the save on every level so they survive",
    "   sessions; they are only ever decremented by an actual use. */",
  ],
  'kit moved off the run state');
one('function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(save))}catch(e){}}',
  [
    'function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(save))}catch(e){}}',
    "/* The hint/undo kit is persistent, not per-run. Kept in the save file, given",
    "   2 of each on first ever launch, decremented only by a real use, and topped",
    "   up by a rewarded ad. It never resets just because a game was started. */",
    'const KIT_START=2;',
    'function kit(){',
    "  if(typeof save.undo!=='number')save.undo=KIT_START;",
    "  if(typeof save.hint!=='number')save.hint=KIT_START;",
    '  return save;',
    '}',
    'function giveKit(kind,n){',
    '  kit();',
    "  if(kind==='undo')save.undo+=n; else save.hint+=n;",
    '  persist();',
    '}',
  ],
  'persistent kit helpers');
one("if(!save.levels)save.levels={};",
  [
    "if(!save.levels)save.levels={};",
    "kit();   /* seeds undo/hint to 2 on a fresh save */",
  ],
  'kit seeded at load');

/* seed G from the save on every level start */
one('  G.lvlIdx=idx;',
  [
    '  G.lvlIdx=idx;',
    '  /* Re-seed from the persistent kit every level. These are NOT a per-run',
    '     allowance any more, so whatever is left carries across sessions. */',
    '  kit(); G.undoLeft=save.undo; G.hintLeft=save.hint;',
  ],
  'level start re-seeds from the save');
/* keep the save in step whenever they change */
{
  const spots = [
    ["  G.undoLeft--;updateUseBadges();", "  G.undoLeft--;save.undo=Math.max(0,save.undo-1);persist();updateUseBadges();"],
    ["  G.hintLeft--;updateUseBadges();", "  G.hintLeft--;save.hint=Math.max(0,save.hint-1);persist();updateUseBadges();"],
  ];
  let n = 0;
  lines = lines.map(l => {
    for (const [a, b] of spots) if (l.trim() === a.trim()) { n++; return b; }
    return l;
  });
  console.log('OK   kit decrements persist (' + n + ' call sites)');
}
one("  if(rewardKind==='undo')G.undoLeft++;",
  [
    "  if(rewardKind==='undo'){G.undoLeft++;giveKit('undo',1);}",
  ],
  'undo reward persists');
{
  const i = find("else if(rewardKind==='hint')G.hintLeft++;");
  if (i < 0) console.log('MISS hint reward');
  else { lines[i] = "  else if(rewardKind==='hint'){G.hintLeft++;giveKit('hint',1);}"; console.log('OK   hint reward persists'); }
}

fs.writeFileSync(FILE, lines.join(NL));
const out = fs.readFileSync(FILE, 'utf8');
console.log('\nchecks:');
console.log('  boot audio  :', /BGM starts at boot|AudioSys\.startMusic\(\); \}\}catch\(e\)\{\}/.test(out));
console.log('  sheet closed:', /if\(name!=='game'\)\{ try\{ closePanels\(\); \}catch\(e\)\{\} \}/.test(out));
console.log('  kit persist :', /function giveKit\(kind,n\)/.test(out) && /KIT_START=2/.test(out));
console.log('  seed/level  :', /G\.undoLeft=save\.undo; G\.hintLeft=save\.hint;/.test(out));