/* Give the remaining games a banner() that actually reaches the shell.
 *
 * WHY A SCRIPT
 * The Studio SDK block is injected verbatim into every game, so it is
 * byte-identical across them - which is exactly why editing them by hand is how
 * they drift apart. Six games still carried the old no-op
 *
 *     banner:function(){}
 *
 * so they could poll for a banner for ever and never once reach the SDK. The
 * three games that work now (root-io, magnet-pull, midnight-overdrive) share
 * the replacement below, taken verbatim from root-io so all nine match.
 *
 * Idempotent: a game that already forwards is reported and left alone.
 *
 *     node Tools/_apply_banner_shim.js            # dry run, changes nothing
 *     node Tools/_apply_banner_shim.js --write
 */
'use strict';
const fs = require('fs');
const path = require('path');
const GAMES = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'games');
const WRITE = process.argv.includes('--write');

const OLD_COMMENT = [
  '/* BANNERS ARE OFF.',
  '         Banners are disabled app-wide for now. The call is kept so the games that',
  '         still poll for it keep working - it just does nothing, and no banner',
  '         request ever reaches the SDK. Re-enabling banners means restoring the',
  '         bridge handler in GameActivity and the unit in AdMobManager. */',
].join('\n');

const NEW_COMMENT = [
  '/* Banner strip. Opt-in is PER GAME and lives at the CALL SITE: a game',
  '         that never calls this gets no banner. This only carries the request to',
  '         the shell, which decides whether to actually show one. show=true asks',
  '         for the strip, show=false hands it back. */',
].join('\n');

const OLD_FN = '      banner:function(){}';

const NEW_FN = [
  '      banner:function(show){',
  '        var b=bridge();',
  '        if(!b)return;',
  '        try{',
  '          if(show){ if(b.showBanner)b.showBanner(); }',
  '          else{ if(b.hideBanner)b.hideBanner(); }',
  '        }catch(_){}',
  '      }',
].join('\n');

let changed = 0;
const skipped = [];

for (const dir of fs.readdirSync(GAMES).sort()) {
  const file = path.join(GAMES, dir, 'index.html');
  if (!fs.existsSync(file)) continue;
  let html = fs.readFileSync(file, 'utf8');

  if (!html.includes('Studio.ads')) { skipped.push(dir + ' (no Studio shim)'); continue; }
  if (html.includes('banner:function(show)')) { skipped.push(dir + ' (already forwards)'); continue; }
  if (!html.includes(OLD_FN)) { skipped.push(dir + ' (no stub to replace)'); continue; }

  const before = html;
  html = html.split(OLD_COMMENT).join(NEW_COMMENT);
  html = html.split(OLD_FN).join(NEW_FN);

  if (html === before) { skipped.push(dir + ' (no change)'); continue; }
  if (WRITE) fs.writeFileSync(file, html, 'utf8');
  console.log((WRITE ? 'OK   ' : 'would change ') + dir);
  changed++;
}

console.log('\n' + changed + ' game(s) ' + (WRITE ? 'updated' : 'would change') + (WRITE ? '' : ' - rerun with --write'));
skipped.forEach(s => console.log('  skipped ' + s));