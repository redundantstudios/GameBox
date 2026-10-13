'use strict';
const fs = require('fs');
const path = require('path');
const F = path.join('app', 'src', 'main', 'assets', 'games', 'mimic', 'index.html');
let s = fs.readFileSync(F, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
const lines = s.split(NL);

/* MIMIC draws its OWN back button on the canvas (clayCircleBtn), so this is
   where the icon and the styling live - there is no shell button to repaint.

   The glyph was three stroked points 7px tall with a 3px line, which came out
   as a thin tick rather than an arrow. Replaced with a proper chevron, scaled to
   the button, with a cream ring so it reads on the clay face. */
{
  const i = lines.findIndex(l => l.indexOf('function backBtn(g){') >= 0);
  if (i < 0) { console.log('MISS backBtn'); process.exit(1); }
  let end = i;
  while (end < lines.length && lines[end].trim() !== '}') end++;

  lines.splice(i, end - i + 1,
    'function backBtn(g){',
    '  /* The glyph was a 14px three-point tick with a 3px stroke, which read as a',
    "   * stray mark rather than an arrow. Drawn as a proper chevron sized to the",
    '   * button, with a faint cream ring behind it so it holds up on the clay. */',
    '  clayCircleBtn(g.back.x,g.back.y,g.back.r,CREAM,C_DARK,\'back\',function(x,y){',
    '    ctx.save();',
    '    ctx.strokeStyle=\'rgba(255,255,255,0.55)\';',
    '    ctx.lineWidth=5.4; ctx.lineCap=\'round\'; ctx.lineJoin=\'round\';',
    '    ctx.beginPath(); ctx.moveTo(x+4.6,y-8.4); ctx.lineTo(x-4.4,y); ctx.lineTo(x+4.6,y+8.4); ctx.stroke();',
    '    ctx.strokeStyle=DARK;',
    '    ctx.lineWidth=3.2;',
    '    ctx.beginPath(); ctx.moveTo(x+4.6,y-8.4); ctx.lineTo(x-4.4,y); ctx.lineTo(x+4.6,y+8.4); ctx.stroke();',
    '    ctx.restore();',
    '  });',
    '}');
  console.log('OK   back button glyph replaced with a proper chevron');
}

/* The tap sound: this button exits via tryNativeExit, so give it the game tick
   like every other control, and make sure the play screen path does too. */
{
  const i = lines.findIndex(l => l.indexOf("pressId='back'; pressT=simTime; uiTick(); popGo('play'); return;") >= 0);
  if (i < 0) console.log('MISS back press (play screen)');
  else {
    lines[i] = "  if(inC(g.back,x,y)){ pressId='back'; pressT=simTime; SFX.tap(); uiTick(); popGo('play'); return; }";
    console.log('OK   back tap sound on the play screen');
  }
  const j = lines.findIndex(l => l.indexOf("pressId='back'; pressT=simTime; uiTick(); popGo(") >= 0);
  if (j >= 0 && lines[j].indexOf('SFX.tap()') < 0) {
    lines[j] = lines[j].replace("pressT=simTime; uiTick();", "pressT=simTime; SFX.tap(); uiTick();");
    console.log('OK   back tap sound on the other screen');
  }
}

fs.writeFileSync(F, lines.join(NL));
const out = fs.readFileSync(F, 'utf8');
console.log('\nchecks:');
console.log('  chevron      :', /ctx\.lineTo\(x\+4\.6,y\+8\.4\)/.test(out));
console.log('  best centred :', /const bpx=W\/2-bpW\/2;/.test(out));
console.log('  centre label :', /function centreLabel\(p\)/.test(out));
console.log('  add below    :', /const py=cy\+MR\*2\.35;/.test(out));
console.log('  tap on back  :', (out.match(/pressId='back'[^;]*;[^;]*;[^;]*SFX\.tap\(\)/g) || []).length >= 1);