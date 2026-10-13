'use strict';
const fs = require('fs');

/* Remove the autoPath call. The function was deleted on request, but the
   DOMContentLoaded hook that called it stayed, so every launch threw
   ReferenceError: autoPath is not defined. */
const from = "    var auto=autoPath();\n    if(!auto){try{syncBanner()}catch(e){}}";
const to = "    try{syncBanner()}catch(e){}";

// 1. the generator, so a regeneration stays correct
{
  const p = 'Tools/_cc_shell.js';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes(from)) { fs.writeFileSync(p, s.replace(from, to)); console.log('OK   generator patched'); }
  else console.log('     generator: already patched or text differs');
}
// 2. the built game
{
  const p = 'app/src/main/assets/games/chinese-checkers/index.html';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes(from)) { fs.writeFileSync(p, s.replace(from, to)); console.log('OK   game patched'); }
  else console.log('MISS game: text differs');
}