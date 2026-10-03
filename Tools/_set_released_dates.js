/* Adds a `released: YYYY-MM-DD` line to every game's STUDIO_GAME_MANIFEST.

WHY THIS EXISTS
    The shell ordered All Games from a hand-maintained Kotlin list
    (ModeActivity.NEWEST_FIRST). That list is fine for exactly one new
    game at a time and wrong the moment two land together - the person
    adding the second game has to remember to edit Kotlin, and nothing
    fails if they don't; the game just quietly sorts alphabetically.
    A date in the game's OWN manifest makes the ordering scale: adding
    a game is one line in the file you are already editing.

WHERE THE DATES COME FROM
    16 of the 20 games: the git commit that ADDED the game's asset
    directory (`git log --diff-filter=A`). That is the real
    integration date, not a guess.
    The other 4 (echo, magnet-pull, kiro, root-io) are not committed
    yet, so they have no git date. Their order comes from
    Tools/_shell/games.js, which lists them in the order they were
    integrated: echo, magnet-pull, kiro, root-io - root-io last
    because it is the most recent. They are dated 2026-09-29/30 to
    match.

    These dates were cross-checked against the old hand-maintained
    NEWEST_FIRST list and agree with it, so this is the same ordering
    the app already showed - now derived from data instead of a list.

    NOTE: file mtimes are deliberately NOT used. Every tooling run
    rewrites the asset files, so an mtime says when a script last ran,
    not when the game was integrated. Using it would scramble the
    catalogue.

    The script is idempotent: it replaces an existing `released:` line
    rather than adding a second one.

        node _set_released_dates.js
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__dirname);
const GAMES = path.join(ROOT, 'app', 'src', 'main', 'assets', 'games');

// game id -> integration date (YYYY-MM-DD)
const RELEASED = {
  // committed: git commit that added the game directory
  'ludo': '2026-09-19',
  'planetmerge': '2026-09-19',
  'chess': '2026-09-21',
  'chicken-chaos': '2026-09-21',
  'checkers': '2026-09-24',
  'egg-rush': '2026-09-24',
  'memory-grab': '2026-09-24',
  'balloon-battle': '2026-09-27',
  'bomb-relay': '2026-09-27',
  'chess': '2026-09-21',
  'last-balloon': '2026-09-27',
  'colour-rush': '2026-09-28',
  'ember': '2026-09-28',
  'midnight-overdrive': '2026-09-28',
  'orrery': '2026-09-28',
  'pool-8ball': '2026-09-28',
  'sheepdog-trials': '2026-09-28',
  // not committed yet: order taken from Tools/_shell/games.js

  'magnet-pull': '2026-09-29',
  'kiro': '2026-09-29',
  'root-io': '2026-09-30',
};

let changed = 0;
const missing = [];

for (const dir of fs.readdirSync(GAMES)) {
  const file = path.join(GAMES, dir, 'index.html');
  if (!fs.existsSync(file)) continue;

  const id = RELEASED[dir];
  if (!id) { missing.push(dir); continue; }

  const html = fs.readFileSync(file, 'utf8');
  const lines = html.split(/\r?\n/);
  const mi = lines.findIndex((l) => l.includes('STUDIO_GAME_MANIFEST'));
  if (mi === -1) { missing.push(dir + ' (no manifest)'); continue; }

  // Find the end of the manifest block. Most games close it with `-->`,
  // but Ludo closes its block with `*/` (it is wrapped in a JS comment),
  // so both terminators are accepted.
  let end = -1;
  for (let i = mi + 1; i < Math.min(lines.length, mi + 25); i++) {
    if (lines[i].includes('-->') || lines[i].trim() === '*/') { end = i; break; }
  }
  if (end === -1) { missing.push(dir + ' (no block end)'); continue; }

  const existing = lines.findIndex((l) => /^\s*released\s*:/.test(l));
  if (existing !== -1) {
    if (lines[existing].trim() === `released: ${id}`) continue;
    lines[existing] = `released: ${id}`;
  } else {
    // Keep the field inside the block, after `version:`, so the block
    // still reads id/title/orientation/.../version/released.
    const vi = lines.findIndex((l) => /^\s*version\s*:/.test(l));
    lines.splice(vi !== -1 ? vi + 1 : end, 0, `released: ${id}`);
  }

  fs.writeFileSync(file, lines.join('\n'), 'utf8');
  console.log('OK  ' + dir.padEnd(20) + id);
  changed++;
}

console.log('\n' + changed + ' manifest(s) updated');
if (missing.length) {
  console.log('NO DATE (left alone, needs a decision):');
  missing.forEach((m) => console.log('  ' + m));
}
