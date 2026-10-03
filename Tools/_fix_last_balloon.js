/* Adds the shell lifecycle block to last-balloon.
   This game was hand-edited rather than run through _integrate_games.js, so it
   never received a window.Game block. Every GameActivity call is null-guarded,
   so nothing crashed - but webView.onPause() suspends JS timers while the
   game's own AudioContext keeps running, so music carries on under whatever the
   player opened next. The loop already clamps dt to 0.05s, so no state desync
   was possible on resume: audio really was the only gap.

   Deliberately does NOT use Studio: this file has no sdk.html, and inventing a
   dependency on one would throw inside a null-guarded try. */
const fs = require('fs');
const P = 'app/src/main/main'.replace('main/main', 'main') + '/assets/games/last-balloon/index.html';
const html = fs.readFileSync(P, 'utf8');

/* The file ships a STUB - `window.Game.setSettings=function(s){}` - which passes
   an existence check while providing no pause/resume/destroy at all. Guard on a
   real lifecycle instead, and replace the stub rather than appending a second
   window.Game assignment that would shadow this one. */
if (/window\.Game\.pause\s*=|pause\s*:\s*function/.test(html)) {
  console.log('last-balloon already has a real lifecycle block - nothing to do');
  process.exit(0);
}

const block = [
  '<script>',
  '/* Shell lifecycle + settings. Added during the integration audit because this',
  '   game was hand-edited and never went through _integrate_games.js. */',
  '(function(){',
  '  var prev=window.Game||{};',
  '  function setAudio(on){',
  '    try{',
  '      var c=(A&&A.ctx)?A.ctx:null; if(!c)return;',
  "      if(on){ if(c.state==='suspended'&&c.resume)c.resume(); }",
  "      else if(c.state==='running'&&c.suspend)c.suspend();",
  '    }catch(e){}',
  '  }',
  '  function playerVolume(){',
  "    try{ return (typeof settings.volume==='number')?settings.volume:0.8; }",
  '    catch(e){ return 0.8; }',
  '  }',
  '  window.Game={',
  '    pause:function(){ setAudio(false); if(prev.pause)try{prev.pause();}catch(e){} },',
  '    resume:function(){ setAudio(true); if(prev.resume)try{prev.resume();}catch(e){} },',
  '    setMuted:function(m){',
  '      try{ if(A&&A.vol) A.vol.gain.value=m?0:playerVolume(); }catch(e){}',
  '      if(prev.setMuted)try{prev.setMuted(m);}catch(e){}',
  '    },',
  '    setSettings:function(s){',
  '      try{',
  "        if(s&&typeof s.sound==='boolean'&&A&&A.vol) A.vol.gain.value=s.sound?playerVolume():0;",
  '      }catch(e){}',
  '      if(prev.setSettings)try{prev.setSettings(s);}catch(e){}',
  '    },',
  '    destroy:function(){ setAudio(false); if(prev.destroy)try{prev.destroy();}catch(e){} }',
  '  };',
  '})();',
  '<\/script>'
].join('\r\n');

const close = html.lastIndexOf('</body>');
if (close < 0) throw new Error('last-balloon: no </body>');

/* Prefer replacing the stub, so there is exactly one window.Game in the file. */
const stub = 'window.Game=window.Game||{};\r\nwindow.Game.setSettings=function(s){};';
let out;
if (html.split(stub).length - 1 === 1) {
  out = html.replace(stub, block);
  console.log('last-balloon: stub replaced with a real window.Game lifecycle');
} else {
  out = html.slice(0, close) + block + '\r\n' + html.slice(close);
  console.log('last-balloon: window.Game lifecycle appended');
}
fs.writeFileSync(P, out, 'utf8');