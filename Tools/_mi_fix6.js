'use strict';
const fs = require('fs');
const path = require('path');
const F = path.join('app', 'src', 'main', 'assets', 'games', 'mimic', 'index.html');
const before = fs.readFileSync(F, 'utf8');
const NL = before.includes('\r\n') ? '\r\n' : '\n';
const lines = before.split(NL);
console.log('before: ' + lines.length + ' lines');
let touched = 0;

/* ---------- A: what the middle disc says, and in whose colour ----------
   Last Standing and Own Pattern were showing a stage word with no colour of
   its own, so it was painted in the current player's colour and "WATCH" looked
   like one of the players' turns. Now:
     - pattern showing      -> WATCH, always the same colour, one that is not
                              any player's, so it never reads as a player
     - a player is copying  -> that player's name, in that player's colour
   Solo is unchanged: it is your own marble, so it shows your name. */
{
  const start = lines.findIndex(l => /^\/\* What the centre disc says\./.test(l || ''));
  if (start < 0) { console.log('MISS centreLabel block'); process.exit(1); }
  let end = start;
  while (end < lines.length && lines[end].trim() !== '}') end++;

  lines.splice(start, end - start + 1,
    '/* WATCH always wears this colour - a slate that is not in the player palette,',
    ' * so "WATCH" can never be mistaken for a player about to act. */',
    "const WATCH_COL='#3F5570';",
    '/* What the middle disc says, and in which colour.',
    ' * Last Standing / Own Pattern:',
    ' *   - while the pattern is being shown -> WATCH, fixed colour',
    " *   - while a player is copying it     -> that player's name, own colour",
    ' * Solo is left alone: it is your own marble, so it shows your name. */',
    'function centreInfo(p){',
    "  if(mode==='solo') return p?{txt:p.name,col:p.col}:null;",
    "  if(phase==='watch') return {txt:'WATCH',col:WATCH_COL};",
    '  return p?{txt:p.name,col:p.col}:null;',
    '}');
  console.log('OK   centreInfo replaces centreLabel');

  const d = lines.findIndex(l => /const cl=centreLabel\(p\);/.test(l || ''));
  if (d < 0) { console.log('MISS draw site'); process.exit(1); }
  lines.splice(d, 4,
    '    /* WATCH in its own colour while the pattern plays, then the player\'s',
    '       name in their colour for their turn. */',
    '    const ci=centreInfo(p);',
    '    if(ci){',
    '      ctx.fillStyle=ci.col;',
    "      ctx.font='800 '+Math.round(ci.txt.length>2?Math.min(MR*0.22,18):Math.min(MR*0.30,20))+'px '+FONT;",
    '      ctx.fillText(ci.txt, cx, cy-6);',
    '    }');
  console.log('OK   disc draws the label in its own colour');
  touched++;
}

/* ---------- B: the start-page back button ----------
   This one is NOT backBtn() - drawTitle() drew its own: a flat outlined circle
   with a FILLED triangle on it, which is why the icon looked like a triangle
   and the button did not match the game. Replaced with the same clayCircleBtn
   (CREAM on C_DARK) the settings gear uses, and an open arrow instead of a
   solid wedge. backBtn() now shares the same icon so both match. */
{
  const start = lines.findIndex(l => /Back to the shell\. The hit-box was there/.test(l || ''));
  if (start < 0) { console.log('MISS title back'); process.exit(1); }
  let end = start;
  while (end < lines.length && lines[end].trim() !== '})();') end++;
  if (end >= lines.length) { console.log('MISS title back end'); process.exit(1); }

  lines.splice(start, end - start + 1,
    '  /* The start-page back button used to be drawn here by hand: a flat outlined',
    '   * circle with a FILLED triangle on it, which is why it read as a triangle',
    '   * and did not match the rest of the game. It now uses the same clay circle',
    '   * the settings gear uses, with an open arrow. Passing "backout" gives it the',
    '   * same pressed animation as the other clay buttons. */',
    '  (function(){',
    '    var r=titleBackGeom();',
    '    clayCircleBtn(r.x+r.w/2,r.y+r.h/2,r.w/2,CREAM,C_DARK,\'backout\',function(x,y){',
    '      drawBackArrow(x,y,r.w/2);',
    '    });',
    '  })();');
  console.log('OK   title back button now a clay circle with an arrow');
  touched++;
}

/* shared icon used by both back buttons */
{
  const d = lines.findIndex(l => /function backBtn\(g\)/.test(l || ''));
  if (d < 0) { console.log('MISS backBtn'); process.exit(1); }
  let end = d;
  while (end < lines.length && lines[end].trim() !== '}') end++;
  lines.splice(d, end - d + 1,
    '/* The back glyph: a shaft with an open head. A solid triangle was used here',
    ' * before and read as a triangle rather than as "go back". */',
    'function drawBackArrow(x,y,r){',
    '  ctx.save();',
    '  ctx.strokeStyle=DARK;',
    '  ctx.lineWidth=Math.max(2.4,r*0.13);',
    "  ctx.lineCap='round'; ctx.lineJoin='round';",
    '  const s=r*0.30, h=r*0.44;',
    '  ctx.beginPath(); ctx.moveTo(x-s*1.6,y); ctx.lineTo(x+s*0.4,y); ctx.stroke();',
    '  ctx.beginPath(); ctx.moveTo(x-s*0.3,y-h); ctx.lineTo(x+s*0.8,y); ctx.lineTo(x-s*0.3,y+h); ctx.stroke();',
    '  ctx.restore();',
    '}',
    'function backBtn(g){',
    '  /* Same clay face as the settings gear, without the idle rotation. */',
    '  clayCircleBtn(g.back.x,g.back.y,g.back.r,CREAM,C_DARK,\'back\',function(x,y){',
    '    drawBackArrow(x,y,g.back.r);',
    '  });',
    '}');
  console.log('OK   shared drawBackArrow used by both back buttons');
  touched++;
}

fs.writeFileSync(F, lines.join(NL));
const out = fs.readFileSync(F, 'utf8');
console.log('after:  ' + fs.readFileSync(F, 'utf8').split(NL).length + ' lines');
console.log('\nchecks:');
console.log('  edits applied :', touched + '/3');
console.log('  no centreLabel:', !/centreLabel/.test(out));
console.log('  WATCH colour  :', /const WATCH_COL='#3F5570';/.test(out));
console.log('  no fillTri    :', !/closePath\(\); ctx\.fill\(\);\s*$/.test(out.split('function drawTitle')[1] || ''));
console.log('  shared arrow  :', /function drawBackArrow\(x,y,r\)/.test(out));
console.log('  title uses it :', /clayCircleBtn\(r\.x\+r\.w\/2,r\.y\+r\.h\/2,r\.w\/2,CREAM,C_DARK,'backout'/.test(out));