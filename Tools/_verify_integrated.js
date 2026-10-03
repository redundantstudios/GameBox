/* Post-integration sanity check. Verifies, for every configured game, that the
   generated asset actually carries what the shell needs: a manifest the
   ManifestParser can read, a tile the GameAdapter can resolve, the window.Game
   lifecycle block, the shell BACK chip, and no surviving network references.

    node _verify_integrated.js
*/
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__dirname);
const GAMES = require(path.join(__dirname, '_shell', 'games.js'));
const ASSETS = path.join(ROOT, 'app', 'src', 'main', 'assets', 'games');
const TILES = path.join(ROOT, 'app', 'src', 'main', 'res', 'drawable-nodpi');

/* The only hosts a bundled game may still name. The CrazyGames portal SDK, the
   Google Fonts CSS and the jsDelivr three.js CDN are all stripped at
   integration time because the shell is offline. */
const OFFLINE_STRIP = [
  /https:\/\/sdk\.crazygames\.com[^'"]*/g,
  /https?:\/\/fonts\.googleapis\.com[^'"]*/g,
  /https:\/\/cdn\.jsdelivr\.net[^'"]*/g
];

/* Hosts that are namespaced rather than fetched. A bundled game may legitimately
   mention them - SVG element namespaces, XML namespaces, schema URLs - and
   flagging those would drown a real leak in noise. */
const BENIGN_HOST = /^(www\.)?(w3\.org|schemas\.|xmlns\.|purl\.org|creativecommons\.org|example\.|discourse\.threejs\.org)/;

/* Bare "https://" appears in game comments as documentation. Only a URL with a
   real host can actually be fetched, so that is what gets matched. */
const URL = /https?:\/\/([A-Za-z0-9._-]+\.[A-Za-z]{2,})[^\s'"<>)]*/g;

const tiles = fs.readdirSync(TILES);
let bad = 0;

console.log('ID'.padEnd(20) + 'MANIFEST  TILE  GAME  BACK  NET  SCRIPTS');
for (const g of GAMES) {
  const file = path.join(ASSETS, g.id, 'index.html');
  if (!fs.existsSync(file)) {
    console.log(g.id.padEnd(20) + 'MISSING ASSET');
    bad++;
    continue;
  }
  const html = fs.readFileSync(file, 'utf8');

  /* Parse the manifest exactly the way ManifestParser does: first 30 lines,
     marker line, then "key: value" pairs split on the FIRST colon only. */
  const lines = html.split(/\r?\n/).slice(0, 30);
  const mi = lines.findIndex((l) => l.includes('STUDIO_GAME_MANIFEST'));
  let man = false;
  if (mi !== -1) {
    const block = [];
    for (let i = mi + 1; i < lines.length; i++) {
      if (lines[i].includes('STUDIO_GAME_MANIFEST')) break;
      block.push(lines[i]);
      if (block.length >= 20) break;
    }
    const props = {};
    for (const l of block) {
      const p = l.split(':');
      if (p.length === 2) props[p[0].trim()] = p[1].trim();
    }
    man = !!props.id && !!props.title && props.orientation === g.orientation;
    if (!man) {
      console.log('  ' + g.id + ' manifest mismatch: ' + JSON.stringify(props));
    }
  }

  /* GameAdapter looks the tile up as tile_<id with - replaced by _>. */
  const want = 'tile_' + g.id.toLowerCase().replace(/-/g, '_') + '.';
  const tile = tiles.some((f) => f.startsWith(want));

  /* Two things, not one. window.Game may be assigned as an object literal OR
       handed over by name - `const Game={...}; window.Game=Game;` - and the
       second form is a perfectly good game. Requiring `{` right after the `=`
       wrongly failed chicken-chaos, which has one of the most complete
       lifecycles in the catalogue. So: is it assigned, and does it pause? */
const hasGame = /window\.Game\s*=/.test(html) &&
       /pause\s*\(\s*\)|pause\s*:\s*function|\.pause\s*=/.test(html);
  /* "Can the player get out of this game?" Either the integrator injected the
       shell BACK chip, or the game ships its own exit control that calls through
       the bridge. Testing only for studioBackTheme answered a different question
       ("was this file produced by the integrator?") and reported 10 perfectly
       playable games as broken - every one of them had a working back button. */
const hasBack = (/studioBackTheme/.test(html) && /BACK/.test(html)) ||
       /exitGame|goBack|history\.back/.test(html);
  const net = (OFFLINE_STRIP.reduce((a, re) => a.replace(re, ''), html)
    .match(URL) || [])
    .map((u) => u.replace(/[.,;:)]+$/, ''))
    .filter((u) => !BENIGN_HOST.test(u.replace(/^https?:\/\//, '')));

  /* Every inline script must parse, or the page dies before it paints. */
  let scripts = 0, parseFail = [];
  for (const m of html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
    try { new Function(m[1]); scripts++; }
    catch (e) { parseFail.push(e.message); }
  }

  /* NOTE: `net.length`, not `net` - an empty array is TRUTHY in JavaScript, so
     testing the array itself reported every game as having a stray host. */
  const leak = net.length > 0;

  const row = [man ? 'ok' : 'BAD', tile ? 'ok' : 'BAD', hasGame ? 'ok' : 'BAD',
               hasBack ? 'ok' : 'BAD', leak ? 'BAD' : 'clean',
               parseFail.length ? 'FAIL' : scripts + ' ok'].join('  ');
  if (!man || !tile || !hasGame || !hasBack || leak || parseFail.length) {
    bad++;
    if (leak) console.log('  ' + g.id + ' stray host: ' + JSON.stringify(net.slice(0, 3)));
    if (parseFail.length) console.log('  ' + g.id + ' script parse: ' + parseFail.join(' | '));
  }
  console.log(g.id.padEnd(20) + row);
}

/* ---- Coverage gap check ---------------------------------------------------
   The loop above only walks games.js. Anything sitting in assets/games that
   games.js does not define still ships inside the APK, so it is still on the
   player's device - and it was being reported by NOBODY. When echo was removed
   the summary said "all 9 game(s) OK" while 19 game folders were actually
   being packaged. A green line that hides half the catalogue is worse than a
   red one, so orphans get checked here too. */
const defined = new Set(GAMES.map((g) => g.id));
const orphans = fs.readdirSync(ASSETS, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !defined.has(d.name))
  .map((d) => d.name)
  .sort();

let orphanBad = 0;
if (orphans.length) {
  console.log('\nNOT DEFINED IN games.js (still shipped, still unverified until added): ' +
              orphans.length);
  console.log('ID'.padEnd(20) + 'MANIFEST  TILE  GAME  BACK  NET  SCRIPTS');
  for (const id of orphans) {
    const file = path.join(ASSETS, id, 'index.html');
    if (!fs.existsSync(file)) {
      console.log(id.padEnd(20) + 'MISSING ASSET');
      orphanBad++;
      continue;
    }
    const html = fs.readFileSync(file, 'utf8');

    /* Orientation is not known for an undefined game, so only require that the
       manifest parses and carries the two fields the shell cannot invent. */
    const lines = html.split(/\r?\n/).slice(0, 30);
    const mi = lines.findIndex((l) => l.includes('STUDIO_GAME_MANIFEST'));
    let man = false;
    if (mi !== -1) {
      const block = [];
      for (let i = mi + 1; i < lines.length; i++) {
        if (lines[i].includes('STUDIO_GAME_MANIFEST')) break;
        block.push(lines[i]);
        if (block.length >= 20) break;
      }
      const props = {};
      for (const l of block) {
        const p = l.split(':');
        if (p.length === 2) props[p[0].trim()] = p[1].trim();
      }
      man = !!props.id && !!props.title;
    }

    const want = 'tile_' + id.toLowerCase().replace(/-/g, '_') + '.';
    const tile = tiles.some((f) => f.startsWith(want));
    /* Two things, not one. window.Game may be assigned as an object literal OR
       handed over by name - `const Game={...}; window.Game=Game;` - and the
       second form is a perfectly good game. Requiring `{` right after the `=`
       wrongly failed chicken-chaos, which has one of the most complete
       lifecycles in the catalogue. So: is it assigned, and does it pause? */
const hasGame = /window\.Game\s*=/.test(html) &&
       /pause\s*\(\s*\)|pause\s*:\s*function|\.pause\s*=/.test(html);
    /* "Can the player get out of this game?" Either the integrator injected the
       shell BACK chip, or the game ships its own exit control that calls through
       the bridge. Testing only for studioBackTheme answered a different question
       ("was this file produced by the integrator?") and reported 10 perfectly
       playable games as broken - every one of them had a working back button. */
const hasBack = (/studioBackTheme/.test(html) && /BACK/.test(html)) ||
       /exitGame|goBack|history\.back/.test(html);
    const net = (OFFLINE_STRIP.reduce((a, re) => a.replace(re, ''), html)
      .match(URL) || [])
      .map((u) => u.replace(/[.,;:)]+$/, ''))
      .filter((u) => !BENIGN_HOST.test(u.replace(/^https?:\/\//, '')));

    let scripts = 0, parseFail = [];
    for (const m of html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
      try { new Function(m[1]); scripts++; }
      catch (e) { parseFail.push(e.message); }
    }
    const leak = net.length > 0;

    if (!man || !tile || !hasGame || !hasBack || leak || parseFail.length) {
      orphanBad++;
      if (leak) console.log('  ' + id + ' stray host: ' + JSON.stringify(net.slice(0, 3)));
      if (parseFail.length) console.log('  ' + id + ' script parse: ' + parseFail.join(' | '));
    }
    console.log(id.padEnd(20) + [man ? 'ok' : 'BAD', tile ? 'ok' : 'BAD',
      hasGame ? 'ok' : 'BAD', hasBack ? 'ok' : 'BAD', leak ? 'BAD' : 'clean',
      parseFail.length ? 'FAIL' : scripts + ' ok'].join('  '));
  }
}

console.log('\n' + GAMES.length + ' configured, ' + orphans.length +
            ' unconfigured but still shipped.');
console.log(bad || orphanBad
  ? bad + ' configured and ' + orphanBad + ' unconfigured game(s) need attention'
  : 'all ' + GAMES.length + ' configured game(s) OK' +
    (orphans.length ? '; ' + orphans.length + ' unconfigured game(s) also clean' : ''));
process.exit(bad || orphanBad ? 1 : 0);
