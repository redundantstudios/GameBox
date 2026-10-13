'use strict';
const fs = require('fs');
const path = require('path');
const F = path.join('app', 'src', 'main', 'assets', 'games', 'mimic', 'index.html');
let s = fs.readFileSync(F, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
let lines = s.split(NL);
const find = (t, from = 0) => { for (let k = from; k < lines.length; k++) if (lines[k].includes(t)) return k; return -1; };
function one(t, repl, label) {
  const i = find(t);
  if (i < 0) { console.log('MISS  ' + label); return; }
  lines.splice(i, 1, ...repl);
  console.log('OK   ' + label);
}

/* ===== 4. THE MIDDLE CIRCLE SHOWED A PLAYER NAME, NOT THE STAGE =====
   In last standing and own pattern the centre disc printed p.name - so it read
   "P5" while a pattern was showing, and "MIMI" if you had come straight from
   MIMI mode, because the name was left over from the previous mode. It should
   name the STAGE there. Solo keeps the player's own name, which is correct. */
{
  const i = find('function drawPhaseBanner(){');
  if (i < 0) console.log('MISS drawPhaseBanner');
  else {
    lines.splice(i, 0,
      '/* What the centre disc says. Solo is about your own marble, so the name is',
      '   right there. In the relay modes (last standing, own pattern) the disc',
      '   must name the STAGE instead - it was showing the last player name, which',
      "   read as 'P5' during a pattern and 'MIMI' when arriving from MIMI mode. */",
      'function centreLabel(p){',
      "  if(mode==='solo') return p?p.name:'';",
      "  if(phase==='watch') return 'WATCH';",
      "  if(phase==='add') return 'ADD';",
      "  if(phase==='repeat') return 'REPEAT';",
      "  if(phase==='input') return 'REPEAT';",
      "  return p?p.name:'';",
      '}',
      '');
    console.log('OK   centreLabel helper');
  }
}
one('    ctx.fillText(p.name, cx, cy-6);',
  ['    /* Stage word in the relay modes, the player\'s own name in solo. */',
   '    const cl=centreLabel(p);',
   '    if(cl){',
   '      ctx.font=\'800 \'+Math.round(Math.min(MR*0.30,20))+\'px \'+FONT;',
   '      ctx.fillText(cl, cx, cy-6);',
   '    }'],
  'middle circle shows the stage word');

/* also the smaller disc labels */
one('    ctx.fillText(p.name,cx,cy+MR*sc*0.02);',
  ['    { const cl=centreLabel(p); if(cl) ctx.fillText(cl,cx,cy+MR*sc*0.02); }'],
  'small disc shows the stage word');

/* ===== 3. "ADD A TILE" BELOW THE TILES, IN THE GAME'S OWN STYLE =====
   It was a big sticker drawn over the middle of the board, covering the tiles it
   was talking about. Moved under the tile row and restyled as a clay pill. */
{
  const start = find('function drawAddFlash(){');
  if (start < 0) console.log('MISS drawAddFlash');
  else {
    let end = start;
    while (end < lines.length && lines[end].trim() !== '}') end++;
    if (end >= lines.length) console.log('MISS drawAddFlash end');
    else {
      lines.splice(start, end - start + 1,
        '/* ADD A TILE - shown UNDER the tiles, in the game\'s clay style. It used to',
        '   be a big sticker drawn over the middle of the board, covering the very',
        "   tiles it was talking about. */",
        'function drawAddFlash(){',
        "  if(screen!=='play' || overlay) return;",
        "  if(phase!=='add') return;",
        '  const age=simTime-addFlashT;',
        '  if(age<0 || age>1400) return;',
        '  const pop=easeOutBack(clamp(age/300,0,1));',
        '  const al=age>1000?1-(age-1000)/400:1;',
        '  const col=curCol();',
        '  ctx.save();',
        '  ctx.globalAlpha=Math.max(0,al);',
        '  /* sits below the disc and its dot row, not on top of them */',
        '  const py=cy+MR*2.35;',
        '  ctx.translate(cx,py);',
        '  const k=0.86+0.14*pop;',
        '  ctx.scale(k,k);',
        "  ctx.font='800 20px '+FONT;",
        "  ctx.textAlign='center'; ctx.textBaseline='middle';",
        "  const tw=ctx.measureText('ADD A TILE').width;",
        '  const pw=tw+40, ph=38, r=ph/2;',
        '  /* clay pill: a soft shadow, a dark rim, then the face */',
        "  ctx.fillStyle='rgba(74,55,40,0.22)'; rr(-pw/2,-ph/2+3,pw,ph,r); ctx.fill();",
        '  ctx.fillStyle=DARK; rr(-pw/2,-ph/2,pw,ph,r); ctx.fill();',
        "  ctx.fillStyle=CREAM; rr(-pw/2+3,-ph/2+3,pw-6,ph-6,r-3); ctx.fill();",
        '  /* a small wedge pointing back up at the tiles */',
        '  ctx.fillStyle=DARK;',
        '  ctx.beginPath(); ctx.moveTo(-7,-ph/2); ctx.lineTo(7,-ph/2); ctx.lineTo(0,-ph/2-9); ctx.closePath(); ctx.fill();',
        '  ctx.fillStyle=col;',
        "  ctx.fillText('ADD A TILE',0,1);",
        '  ctx.restore();',
        '}');
      console.log('OK   ADD A TILE moved below the tiles, clay-styled');
    }
  }
}

fs.writeFileSync(F, lines.join(NL));
const out = fs.readFileSync(F, 'utf8');
console.log('\nchecks:');
console.log('  centre label :', /function centreLabel\(p\)/.test(out));
console.log('  no stale name:', /ctx\.fillText\(p\.name, cx, cy-6\)/.test(out) === false);
console.log('  add below    :', /const py=cy\+MR\*2\.35;/.test(out));