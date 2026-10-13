'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/mimic/index.html';
let s = fs.readFileSync(f, 'utf8');

const swap = (from, to, label) => {
  const re = from instanceof RegExp ? from : new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  if (!re.test(s)) { console.log('MISS ' + label); return; }
  s = s.replace(re, to);
  console.log('OK   ' + label);
};

/* ---- names: P1..P5 ---- */
swap(
  /playerNames:\['TERRA','SKY','SAGE','HONEY','LILAC'\]/,
  "playerNames:['P1','P2','P3','P4','P5']",
  'player names P1..P5');

/* ---- turn-change sequence ----
   In LAST STANDING and OWN PATTERN nobody could tell whose turn it was. The
   name is now P1/P2... which matches the order, and a turn card announces the
   player - large, in their colour - while input is blocked, so the beat cannot
   be skipped by tapping through it. */
swap(
  /function firstAliveIdx\(\)\{/,
  '/* TURN CHANGE. Announces the player and holds input for the length of the\n' +
  "   beat, so the swap cannot be tapped past. */\n" +
  'var turnFx={on:false,t:0,dur:640,idx:0,done:null};\n' +
  'function startTurnFx(idx,done){\n' +
  '  turnFx.on=true; turnFx.t=0; turnFx.idx=idx; turnFx.done=done;\n' +
  '  inputOn=false; inputIdx=0;\n' +
  '}\n' +
  'function updateTurnFx(dt){\n' +
  '  if(!turnFx.on)return;\n' +
  '  turnFx.t+=dt;\n' +
  '  if(turnFx.t>=turnFx.dur){\n' +
  '    turnFx.on=false;\n' +
  '    var d=turnFx.done; turnFx.done=null;\n' +
  '    if(d)try{d()}catch(e){}\n' +
  '  }\n' +
  '}\n' +
  'function drawTurnFx(){\n' +
  "  if(!turnFx.on)return;\n" +
  '  var p=players[turnFx.idx]; if(!p)return;\n' +
  '  var k=turnFx.t/turnFx.dur;\n' +
  '  /* in fast, hold, out - the hold is where input stays blocked */\n' +
  '  var a=k<0.22?k/0.22:(k>0.78?(1-k)/0.22:1);\n' +
  '  var sc=0.72+0.34*a;\n' +
  '  ctx.save();\n' +
  '  ctx.globalAlpha=Math.max(0,Math.min(1,a));\n' +
  '  ctx.fillStyle="rgba(74,55,40,"+(0.30*a).toFixed(3)+")";\n' +
  '  ctx.fillRect(0,0,W,H);\n' +
  '  /* a ring that closes on the player, in their own colour */\n' +
  '  var rr2=MR*(1.6-0.7*a);\n' +
  '  ctx.strokeStyle=p.col; ctx.lineWidth=4+5*a;\n' +
  '  ctx.beginPath(); ctx.arc(cx,cy,rr2,0,TAU); ctx.stroke();\n' +
  '  /* the player disc, scaling up into place */\n' +
  '  ctx.fillStyle=CREAM;\n' +
  '  ctx.beginPath(); ctx.arc(cx,cy,MR*sc,0,TAU); ctx.fill();\n' +
  '  ctx.fillStyle=p.col;\n' +
  '  ctx.beginPath(); ctx.arc(cx,cy,MR*sc*0.74,0,TAU); ctx.fill();\n' +
  '  /* their marble ring, so colour and seat read together */\n' +
  '  if(ballSprites.length){\n' +
  '    ctx.drawImage(ballSprites[p.col],cx-MR*sc*0.36,cy-MR*sc*0.36,MR*sc*0.72,MR*sc*0.72);\n' +
  '  }\n' +
  "  ctx.fillStyle=DARK;\n" +
  "  ctx.font='800 '+Math.round(MR*0.66)+'px '+FONT;\n" +
  "  ctx.textAlign='center'; ctx.textBaseline='middle';\n" +
  '  ctx.fillText(p.name,cx,cy+MR*sc*0.02);\n' +
  "  ctx.font='700 13px '+FONT;\n" +
  "  ctx.fillStyle='rgba(74,55,40,0.66)';\n" +
  "  ctx.fillText('PLAYER',cx,cy+MR*sc*0.72);\n" +
  '  ctx.restore();\n' +
  '}\n' +
  'function firstAliveIdx(){',
  'turn fx added');

/* drive it from the sim clock, and draw it */
swap(/  try\{ updFX\(sdt\); updParticles\(sdt\); \}/,
     '  try{ updateTurnFx(sdt); }catch(e){ sectErr(e); }\n  try{ updFX(sdt); updParticles(sdt); }', 'step drives fx');
swap(/  draw\(\);\r?\n  \}catch\(e\)\{ softFail\(e\); \}/,
     '  draw();\n  try{ drawTurnFx(); }catch(e){}\n  }catch(e){ softFail(e); }', 'draw fx');

/* LAST STANDING: announce before the turn opens */
swap(
  /function partySetTurn\(idx\)\{\r?\n  turn=idx;\r?\n  const p=players\[idx\];\r?\n  if\(!p\) return;\r?\n  inputOn=true; inputIdx=0; phase='repeat';/,
  'function partySetTurn(idx){\n' +
  '  turn=idx;\n' +
  '  const p=players[idx];\n' +
  '  if(!p) return;\n' +
  "  /* Announce the player first; the turn opens when the card has been read. */\n" +
  "  startTurnFx(idx,function(){ inputOn=true; inputIdx=0; phase='repeat'; });\n" +
  "  chip(p.name+\"'S TURN\",1300);",
  'party turn fx');

/* OWN PATTERN: same, and it must block even the opening placement */
swap(
  /  inputOn=true; inputIdx=0; overlay=null;\r?\n  if\(seq\.length===0\)\{ phase='add'; addFlashT=simTime; freeze=Math\.max\(freeze,110\); haptic\('medium'\);/,
  '  /* Announce, then open the turn. */\n' +
  "  startTurnFx(p.idx,function(){ inputOn=true; inputIdx=0; });\n" +
  "  overlay=null;\n" +
  "  if(seq.length===0){ phase='add'; addFlashT=simTime; freeze=Math.max(freeze,110); haptic('medium');",
  'own turn fx');

fs.writeFileSync(f, s);

const checks = {
  'names P1..P5': /playerNames:\['P1','P2','P3','P4','P5'\]/.test(s),
  'turn fx state': /var turnFx=\{on:false/.test(s),
  'blocks input': /inputOn=false; inputIdx=0;\r?\n\}/.test(s),
  'fx drives turn open': /startTurnFx\(idx,function\(\)\{ inputOn=true/.test(s),
  'own pattern too': /startTurnFx\(p\.idx,function\(\)\{ inputOn=true/.test(s),
  'fx stepped': /updateTurnFx\(sdt\)/.test(s),
  'fx drawn': /drawTurnFx\(\)/.test(s),
};
Object.entries(checks).forEach(([k, v]) => console.log((v ? 'OK   ' : 'MISS ') + k));