'use strict';
const fs = require('fs');

for (const g of ['orrery', 'ember']) {
  const f = `app/src/main/assets/games/${g}/index.html`;
  let s = fs.readFileSync(f, 'utf8');
  const pausedVar = g === 'orrery' ? 'paused' : 'P.paused';

  /* Skip the repaint when there is nothing on screen. render() sat outside the
     pause check, so a paused or hidden game kept repainting a full scene 60
     times a second - visible or not. */
  if (g === 'ember') {
    s = s.replace(/\n  render\(\);\n\}/, `\n  if(loopAlive&&!${pausedVar}&&!document.hidden)render();\n}`);
    s = s.replace('if(G.hitStop>0){G.hitStop-=dt;render();return;}',
      'if(G.hitStop>0){G.hitStop-=dt;if(loopAlive&&!document.hidden)render();return;}');
  }

  /* JS_GAME_DESTROY calls Game.destroy(); neither game defined it, so the shell's
     destroy was a silent no-op and a closed game kept its rAF loop running -
     one live full-scene renderer per game that had been opened, until the
     delayed releaseSurface() finally tore its WebView down. */
  const marker = 'window.Game={\n';
  if (/window\.Game=\{\s*\n\s*destroy:function/.test(s) === false) {
    s = s.replace(marker,
      marker + '    destroy:function(){ loopAlive=false; try{if(window.__studioSuspendAudio)window.__studioSuspendAudio();}catch(e){} },\n');
  }

  fs.writeFileSync(f, s);
  console.log(g.padEnd(7),
    'flag=' + /let loopAlive=true/.test(s),
    '| guard=' + new RegExp('!document\\.hidden\\)render\\(\\)').test(s),
    '| destroy=' + /window\.Game=\{\s*\n\s*destroy:function/.test(s));
}