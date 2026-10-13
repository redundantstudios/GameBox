'use strict';
const fs = require('fs');

/* Orrery, Ember and Connect Four lose their banner.
 *
 * Done at the MANIFEST rather than in the game code, because the shell already
 * refuses to build a banner slot for a game whose manifest has no `banner:`
 * line (GameActivity reads it into bannerPlaceholder). The games may still call
 * showBanner() as often as they like - the shell simply never gives them a slot,
 * which is one edit instead of three and cannot drift out of sync with a later
 * change inside a game.
 *
 * Reason from the director: all three lag, and the strip is part of what is
 * being drawn every frame. Smoother matters more here than the impression.
 */
const GAMES = ['orrery', 'ember', 'connect-four'];

for (const g of GAMES) {
  const P = 'app/src/main/assets/games/' + g + '/index.html';
  let s = fs.readFileSync(P, 'utf8');
  const lines = s.split(/\r?\n/);
  const i = lines.findIndex(l => /^\s*banner:\s*bottom\s*$/.test(l || ''));
  if (i < 0) { console.log('SKIP  ' + g + ' (no manifest banner line)'); continue; }

  lines.splice(i, 1,
    '<!-- banner: removed. This game lags and the strip was being redrawn every',
    '     frame; smoothness matters more than the impression here. The shell only',
    '     builds a banner slot for a game whose manifest declares one, so deleting',
    '     that line is the whole fix - the game can still call showBanner() and the',
    '     shell simply never gives it a slot. -->');
  fs.writeFileSync(P, lines.join('\n'));
  console.log('OK    ' + g + ': banner removed from the manifest');
}

console.log('\nverify:');
for (const g of GAMES) {
  const s = fs.readFileSync('app/src/main/assets/games/' + g + '/index.html', 'utf8');
  const manifest = s.slice(0, s.indexOf('</script>'));
  console.log('  ' + g.padEnd(16) + (/^\s*banner:\s*bottom\s*$/m.test(manifest) ? 'STILL HAS banner:' : 'no banner in manifest'));
}
console.log('\ncontrol - a game that should keep its banner:');
const ka = fs.readFileSync('app/src/main/assets/games/knot-away/index.html', 'utf8');
console.log('  knot-away      ' + (/^\s*banner:\s*bottom\s*$/m.test(ka.slice(0, ka.indexOf('</script>'))) ? 'still has banner:' : 'REMOVED (wrong!)'));