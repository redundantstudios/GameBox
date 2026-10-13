'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/chinese-checkers/index.html';
let s = fs.readFileSync(f, 'utf8');
const from = "if(master){const v=m?0:GAME_VOL;sfxG.gain.value=settings.sfx?v:0;musG.gain.value=settings.music?v:0}";
if (s.includes(from)) {
  s = s.replace(from,
    "if(master){const v=m?0:GAME_VOL;sfxG.gain.value=settings.sfx?v*SFX_MAKEUP:0;musG.gain.value=settings.music?v*MUS_MAKEUP:0}");
  fs.writeFileSync(f, s);
  console.log('OK   makeup on setMuted');
} else {
  console.log('MISS makeup on setMuted (text differs)');
  const i = s.indexOf('setMuted:function');
  console.log(JSON.stringify(s.slice(i, i + 220)));
}