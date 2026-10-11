'use strict';
const fs = require('fs');

/* Ember: build the audio graph at boot.
   init() used to return early unless a gesture had been seen, so the score sat
   silent until the player touched something. The guard is gone and the shell
   lifts Chromium's autoplay gate, so the only thing left was to actually CALL
   it at boot - the gesture listeners were the sole caller before. */
const f = 'app/src/main/assets/games/ember/index.html';
let s = fs.readFileSync(f, 'utf8');

if (!/Snd\.init\(\);\s*(\/\/[^\n]*)?\s*$/m.test(s.split('\n').filter(l => /Snd\.init\(\)/.test(l)).slice(-1)[0] || '')) {
  const anchor = 'requestAnimationFrame(frame);';
  const i = s.lastIndexOf(anchor);
  if (i >= 0) {
    s = s.slice(0, i) +
      '/* Build the audio graph at boot so the score is already running when the\n' +
      '   game opens. Before, the first tap was spent arming audio rather than\n' +
      '   doing whatever the player actually aimed at. */\n' +
      'try{Snd.init();}catch(_){}\n' + s.slice(i);
    console.log('boot init added');
  } else {
    console.log('ANCHOR NOT FOUND');
  }
} else {
  console.log('boot init already present');
}
fs.writeFileSync(f, s);
console.log('verify:', /try\{Snd\.init\(\);\}catch\(_\)\{\}/.test(s));