'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join('app', 'src', 'main', 'assets', 'games', 'connect-four', 'index.html');
let s = fs.readFileSync(FILE, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
let lines = s.split(NL);
const find = (t, from = 0) => { for (let k = from; k < lines.length; k++) if (lines[k].includes(t)) return k; return -1; };

/* ===== A. bake the cell shading + contact shadows into one overlay =====
   Measured on device with `dumpsys gfxinfo`:
       Total frames 643 / Janky 458 (71%)
       50th 14ms  90th 20ms  95th 22ms  99th 25ms
       Slow issue draw commands: 458   (== the janky count)
       GPU 50th 2ms / 99th 4ms          (not the bottleneck)
   So the cost is CPU-side draw-command RECORDING, not the GPU. Per frame the
   old code stroked two arcs for every filled cell and filled an ellipse for
   every settled marble - around 250 path operations at a full board - all of
   it redrawn 60 times a second from unchanged data. None of it moves: the
   arcs sit at fixed hole positions and the contact shadow is a soft blob. So
   bake it into one overlay canvas, rebuilt only when the grid actually
   changes, and blit that. */
{
  const i = find('for(let vr=0;vr<ROWS;vr++)for(let c=0;c<COLS;c++){');
  if (i < 0) { console.log('MISS hole loop'); }
  else {
    /* the two loops end just before drawStrike(dt); */
    let j = i;
    while (j < lines.length && !lines[j].includes('drawStrike(dt);')) j++;
    if (j >= lines.length) { console.log('MISS drawStrike anchor'); }
    else {
      lines.splice(i, j - i,
        '  /* Baked overlay: hole shading + contact shadows. See the note where',
        '     buildOverlay() is defined - it is one drawImage instead of ~250 path',
        '     operations per frame, rebuilt only when the grid changes. */',
        '  buildOverlay();',
        '  if(ovlCv)g.drawImage(ovlCv,0,0,BW,BH);');
      console.log('OK   per-frame cell loops -> baked overlay blit');
    }
  }
}

/* define buildOverlay next to the marble sprites */
{
  const i = find('const SHAD=(()=>{');
  if (i < 0) { console.log('MISS SHAD'); }
  else {
    lines.splice(i, 0,
      '/* Pre-compose body+gloss into one sprite. drawMarble() was blitting three',
      '   images per marble (shadow, body, gloss) - 126 of them on a full board -',
      '   when the body and gloss never change relative to each other. */',
      '[1,2].forEach(p=>{',
      "  const c=document.createElement('canvas');c.width=c.height=192;",
      '  const x=c.getContext(\'2d\');',
      '  x.drawImage(MSPR[p].body,0,0);x.drawImage(MSPR[p].gloss,0,0);',
      '  MSPR[p].full=c;',
      '});',
      '',
      '/* Baked overlay in BOARD units (the board is drawn inside a scale(sc,sc)).',
      '   The dark arcs over filled holes and the warm contact shadow under each',
      '   settled marble are static - only the grid changes what they look like - so',
      '   they are rendered once per grid change instead of once per frame. */',
      'let ovlCv=null,ovlKey="";',
      'function buildOverlay(){',
      '  const key=S.grid.join(\'\');',
      '  if(key===ovlKey&&ovlCv)return;',
      '  ovlKey=key;',
      '  if(!ovlCv){ovlCv=document.createElement(\'canvas\');ovlCv.width=BW;ovlCv.height=BH;}',
      "  const c=ovlCv.getContext('2d');",
      '  c.clearRect(0,0,BW,BH);',
      '  for(let vr=0;vr<ROWS;vr++)for(let cc=0;cc<COLS;cc++){',
      '    if(!S.grid[(ROWS-1-vr)*COLS+cc])continue;',
      '    const X=cx(cc),Y=yOfRow(vr);',
      "    c.lineWidth=8;c.strokeStyle='rgba(0,0,0,.42)';",
      '    c.beginPath();c.arc(X,Y,HOLE_R-1,Math.PI*1.02,Math.PI*1.98);c.stroke();',
      "    c.lineWidth=3;c.strokeStyle='rgba(255,190,120,.18)';",
      '    c.beginPath();c.arc(X,Y,HOLE_R-1,Math.PI*.1,Math.PI*.9);c.stroke();',
      '  }',
      "  for(const m of S.marbles)if(m.st==='set'){",
      "    c.fillStyle='rgba(255,215,150,.16)';",
      '    c.beginPath();',
      '    c.ellipse(cx(m.c),yOfGr(m.gr)+MAR_R*.82,MAR_R*.4,MAR_R*.13,0,0,TAU);',
      '    c.fill();',
      '  }',
      '}',
      '');
    console.log('OK   buildOverlay + pre-composed marble sprite');
  }
}

/* ===== B. drawMarble: 3 blits -> 2 ===== */
{
  const i = find('function drawMarble(vx,vy,p,spin,alpha,R,dim){');
  if (i < 0) { console.log('MISS drawMarble'); }
  else {
    const bodyLine = find('g.drawImage(MSPR[p].body,-R,-R,R*2,R*2);', i);
    const plainLine = find('}else g.drawImage(MSPR[p].body,vx-R,vy-R,R*2,R*2);', i);
    const glossLine = find('g.drawImage(MSPR[p].gloss,vx-R,vy-R,R*2,R*2);', i);
    if (bodyLine < 0 || plainLine < 0 || glossLine < 0) { console.log('MISS drawMarble body'); }
    else {
      lines[bodyLine] = '    g.drawImage(MSPR[p].full,-R,-R,R*2,R*2);';
      lines[plainLine] = '}else g.drawImage(MSPR[p].full,vx-R,vy-R,R*2,R*2);';
      lines.splice(glossLine, 1);   /* the gloss is already in .full */
      console.log('OK   drawMarble: 3 blits -> 2');
    }
  }
}

fs.writeFileSync(FILE, lines.join(NL));
const out = fs.readFileSync(FILE, 'utf8');
console.log('\n  overlay blit :', /buildOverlay\(\);\r?\n {2}if\(ovlCv\)g\.drawImage\(ovlCv,0,0,BW,BH\);/.test(out));
console.log('  precomposed  :', /MSPR\[p\]\.full=c;/.test(out));
console.log('  no gloss blit:', !/g\.drawImage\(MSPR\[p\]\.gloss/.test(out));