'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/egg-rush/index.html';
let s = fs.readFileSync(f, 'utf8');

const from =
  '      banner(visible){\n' +
  '        const b=bridge();\n' +
  '        if(!b)return;\n' +
  '        try{ if(visible){ if(b.showBanner)b.showBanner(); } else { if(b.hideBanner)b.hideBanner(); } }catch(e){}\n' +
  '      },';
const to =
  '      /* No banner in this game. The manifest line is gone, so the shell builds no\n' +
  '         container and reserves no space; this stays so the call sites still read.\n' +
  '         The game\'s own turn banner is showBanner() - a different thing, untouched. */\n' +
  '      banner(visible){},';

if (s.includes(from)) {
  s = s.replace(from, to);
  fs.writeFileSync(f, s);
  console.log('egg-rush helper neutralised:', /banner\(visible\)\{\}/.test(fs.readFileSync(f, 'utf8')));
} else {
  console.log('EXACT MATCH FAILED');
}