/* Integrates the playable HTML games into the shell.
 *
 * For every game in Tools/_shell/games.js this
 *   1. drops a STUDIO_GAME_MANIFEST into the first lines of <head> (the shell's
 *      ManifestParser only ever reads the first 30 lines),
 *   2. removes the Google-Fonts <link>s - the shell is offline, so a webfont can
 *      never load and the request is a network call we are not allowed to make,
 *   3. injects the Studio SDK plus the shell BACK button,
 *   4. applies the per-game patches (settings sync, rewarded / interstitial /
 *      banner call sites) and the window.Game lifecycle block,
 *   5. writes app/src/main/assets/games/<id>/index.html.
 *
 * Run:  node Tools/_integrate_games.js [id ...]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__dirname);
const SHELL = path.join(__dirname, '_shell');
const SRC = path.join(ROOT, 'sources', 'Playable Games');
const OUT = path.join(ROOT, 'app', 'src', 'main', 'assets', 'games');

const read = (p) => fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
const GAMES = require(path.join(SHELL, 'games.js'));

function manifest(g) {
  return [
    '<!--',
    'STUDIO_GAME_MANIFEST',
    'id: ' + g.id,
    'title: ' + g.title,
    'orientation: ' + g.orientation,
    'minPlayers: ' + g.min,
    'maxPlayers: ' + g.max,
    'aiSupport: ' + g.ai,
    'online: false',
    'tileColor: ' + g.color,
    'version: ' + (g.version || 1),
    '-->'
  ].join('\n');
}

function applyAll(g, html) {
  /* Patches are authored with \n; the sources are CRLF, so the working copy is
     normalised to LF here and converted back on the way out. */
  html = html.replace(/\r\n/g, '\n');
  /* 1. no webfonts - offline shell */
  if (g.stripFonts !== false) {
    html = html.replace(/^[ \t]*<link rel="preconnect"[^>]*>\r?\n?/gm, '');
    html = html.replace(/^[ \t]*<link href="https:\/\/fonts\.googleapis\.com[^>]*>\r?\n?/gm, '');
  }
  /* 2. per-game patches (asserted: a patch that no longer matches is a bug, not
        a no-op, so a silently broken game can never ship) */
  for (const [find, repl] of (g.patches || [])) {
    const n = html.split(find).length - 1;
    if (n !== 1) throw new Error(g.id + ': patch anchor matched ' + n + ' times: ' + JSON.stringify(find.slice(0, 70)));
    html = html.split(find).join(repl);
  }
  /* 3. shell chrome + SDK straight after <head> */
  const head = /<head[^>]*>/i.exec(html);
  if (!head) throw new Error(g.id + ': no <head>');
  const inject = ['', manifest(g), read(path.join(SHELL, 'back.css')), read(path.join(SHELL, 'sdk.html'))];
  /* optional inlined library (three.js for Midnight Overdrive) */
  if (g.lib) inject.push('<script>\n' + read(path.join(ROOT, g.lib)) + '\n</script>');
  inject.push(read(path.join(SHELL, 'back.html')).replace('@@FRONT@@', g.front));
  const head2 = inject.join('\n');
  html = html.slice(0, head.index + head[0].length) + head2 + '\n' + html.slice(head.index + head[0].length);
  /* 4. per-game wiring at the very end, where every one of the game's own
        globals already exists */
  if (g.wiring) {
    const close = html.lastIndexOf('</body>');
    if (close < 0) throw new Error(g.id + ': no </body>');
    html = html.slice(0, close) + '<script>\n' + g.wiring + '\n</script>\n' + html.slice(close);
  }
  return html;
}

const only = process.argv.slice(2);
let done = 0;
for (const g of GAMES) {
  if (only.length && only.indexOf(g.id) < 0) continue;
  const from = path.join(SRC, g.src);
  if (!fs.existsSync(from)) throw new Error('missing source: ' + from);
  const out = path.join(OUT, g.id, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const html = applyAll(g, read(from)).replace(/\n/g, '\r\n');
  fs.writeFileSync(out, html, 'utf8');
  console.log('  ' + g.id.padEnd(20) + (html.length / 1024).toFixed(0).padStart(5) + ' KB  ->  assets/games/' + g.id + '/index.html');
  done++;
}
console.log('integrated ' + done + ' game(s)');
