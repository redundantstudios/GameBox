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

/* ---- BACK BUTTON: the hit-box existed but nothing was ever DRAWN, so there
   was nothing to tap. Drawn on the title screen only. ---- */
swap(
  /function drawTitle\(\)\{\r?\n\s*const g=titleGeom\(\);/,
  "function drawTitle(){\n" +
  '  /* Back to the shell. The hit-box was there from the start but nothing was\n' +
  '     ever drawn, so there was no button on screen to press. */\n' +
  '  (function(){\n' +
  '    var r=titleBackGeom();\n' +
  '    var down=(pressId===\'backout\');\n' +
  '    ctx.save();\n' +
  "    ctx.fillStyle='rgba(246,236,222,0.92)';\n" +
  '    ctx.beginPath(); ctx.arc(r.x+r.w/2,r.y+r.h/2,r.w/2,0,TAU); ctx.fill();\n' +
  "    ctx.strokeStyle='rgba(74,55,40,0.28)'; ctx.lineWidth=2;\n" +
  '    ctx.beginPath(); ctx.arc(r.x+r.w/2,r.y+r.h/2,r.w/2,0,TAU); ctx.stroke();\n' +
  '    ctx.fillStyle=DARK;\n' +
  '    var s2=r.w*0.26, cx2=r.x+r.w/2-s2*0.55, cy2=r.y+r.h/2;\n' +
  '    ctx.beginPath();\n' +
  '    ctx.moveTo(cx2+s2*0.9,cy2); ctx.lineTo(cx2-s2*0.3,cy2-s2); ctx.lineTo(cx2-s2*0.3,cy2+s2);\n' +
  '    ctx.closePath(); ctx.fill();\n' +
  '    ctx.restore();\n' +
  '  })();\n' +
  '  const g=titleGeom();',
  'back button drawn');

/* set the press state on the way in */
swap(
  /if\(inR\(tb,x,y\)\)\{ uiTick\(\); tryNativeExit\(\); return; \}/,
  "if(inR(tb,x,y)){ pressId='backout'; pressT=simTime; uiTick(); tryNativeExit(); return; }",
  'back press state');

/* ---- AUDIO DIAGNOSTIC ----
   The game is producing no audio at all on device. Rather than guess again,
   report the state the audio path actually ends up in. */
swap(
  /function applyMaster\(\)\{ if\(master\) master\.gain\.value = effMuted\(\)\?0:CFG\.audio\.master\*\(settings\.volume==null\?1:settings\.volume\); \}/,
  'function applyMaster(){\n' +
  '  var v=effMuted()?0:CFG.audio.master*(settings.volume==null?1:settings.volume);\n' +
  "  if(master) master.gain.value=v;\n" +
  "  try{ console.log('[mimic] master='+v+' muted='+effMuted()+' gameMuted='+gameMuted+\n" +
  "    +' sound='+Studio.settings.sound+' vol='+settings.volume); }catch(e){}\n" +
  '}',
  'applyMaster logs');
swap(
  /if\(actx\.state==='suspended'\)\{ try\{ actx\.resume\(\); \}catch\(e\)\{\} \}\r?\n  \}catch\(e\)\{ actx=null; \}/,
  "if(actx.state==='suspended'){ try{ actx.resume(); }catch(e){} }\n" +
  "    try{ console.log('[mimic] ctx='+actx.state+' muted='+effMuted()); }catch(e){}\n" +
  '  }catch(e){ actx=null; }',
  'ensureAudio logs');

fs.writeFileSync(f, s);

const checks = {
  'back drawn': /pressId==='backout'/.test(s),
  'back press': /pressId='backout'; pressT=simTime/.test(s),
  'audio logging': /\[mimic\] master=/.test(s),
};
Object.entries(checks).forEach(([k, v]) => console.log((v ? 'OK   ' : 'MISS ') + k));