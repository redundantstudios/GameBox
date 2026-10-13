'use strict';
const fs = require('fs');
const path = require('path');

/* Remove the stray line that ended up ABOVE <!DOCTYPE html> as visible text, and
   put the reset where it belongs: inside the game's own start function. */
const FIX = [
  ['knot-away', /function startLevel\(idx\)\{/],
  ['truth-or-dare', /function startGame\(\)\{/],
];

const STRAY = /^ {2}\/\* New run: allow the game-over ad again\. \*\/\r?\n {2}try\{ window\.__shellOverAd=0; \}catch\(e\)\{\}\r?\n/m;

for (const [id, re] of FIX) {
  const f = path.join('app/src/main/assets/games', id, 'index.html');
  let s = fs.readFileSync(f, 'utf8');

  const hadStray = STRAY.test(s);
  s = s.replace(STRAY, '');
  s = s.replace('<!DOCTYPE html>\r\n  <!--', '<!DOCTYPE html>\r\n<!--');

  const lines = s.split(/\r?\n/);
  const i = lines.findIndex(l => re.test(l));
  let added = false;
  if (i < 0) console.log('MISS fn ' + id);
  else if (lines.slice(i, i + 6).join('\n').includes('__shellOverAd=0')) added = true;
  else {
    lines.splice(i + 1, 0, '  /* New round: allow the game-over ad again. */',
      '  try{ window.__shellOverAd=0; }catch(e){}');
    added = true;
  }

  fs.writeFileSync(f, lines.join(s.includes('\r\n') ? '\r\n' : '\n'));
  console.log(id.padEnd(14), 'stray removed:', hadStray, '| reset in place:', added,
    '| text at top:', /<!DOCTYPE html>[\s\S]{0,80}New run/.test(fs.readFileSync(f, 'utf8')));
}