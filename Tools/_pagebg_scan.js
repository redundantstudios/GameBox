'use strict';
/*
 * REPORTS EACH GAME'S PAGE BACKGROUND AGAINST ITS DECLARED bannerBg.
 *
 * The shell paints the launch flash and the banner strip with the game's own
 * page background, so that a game does not flash launcher artwork on the way in
 * and does not have a differently-coloured bar sitting over it.
 *
 *   node Tools/_pagebg_scan.js app/src/main/assets/games
 *
 * A row reading NO is a game whose bannerBg is not its page background - its
 * flash and its strip are both off. Each is a one-line change in that game's
 * own manifest, so it can be done by whoever owns the game, with no conflicts.
 *
 * A game with no bannerBg at all falls back to its tile colour for both.
 */
const fs = require('fs');
const path = require('path');

const gamesDir = 'app/src/main/assets/games';
const dir = process.argv[2] || gamesDir;

/** The colour the game actually sits on. */
function pageBackground(html) {
  // The :root custom property the body inherits is the usual answer.
  const root = html.match(/--bg\s*:\s*(#[0-9a-fA-F]{3,8})/);
  if (root) return { hex: root[1], from: '--bg' };
  const body = html.match(/body\s*\{[^}]*background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,8})/);
  if (body) return { hex: body[1], from: 'body' };
  const htmlBg = html.match(/html\s*\{[^}]*background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,8})/);
  if (htmlBg) return { hex: htmlBg[1], from: 'html' };
  // A gradient is not a flat colour, so there is nothing exact to declare.
  // The FIRST stop is the best guess - it is the colour the page is mostly -
  // but it is a guess, and it is marked as one so nobody acts on a wrong number.
  const grad = html.match(/linear-gradient\([^;}]*?(#[0-9a-fA-F]{3,8})/);
  if (grad) return { hex: grad[1], from: 'gradient stop (approx)' };
  const any = html.match(/background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,8})/);
  if (any) return { hex: any[1], from: 'first background' };
  return { hex: '(none found)', from: '-' };
}

/** #abc and #aabbcc are the same colour; the manifest may use either. */
function norm(h) {
  if (!h || !h.startsWith('#')) return h;
  if (h.length === 4) return '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  return h.toUpperCase();
}

console.log('| game | page background | from | bannerBg | match |');
console.log('|---|---|---|---|---|');
const rows = [];
for (const g of fs.readdirSync(dir).sort()) {
  const f = path.join(dir, g, 'index.html');
  if (!fs.existsSync(f)) continue;
  const html = fs.readFileSync(f, 'utf8');
  const bg = pageBackground(html);
  const m = html.match(/bannerBg:\s*(\S+)/);
  const banner = m ? m[1] : '(none)';
  const same = !!m && norm(m[1]) === norm(bg.hex);
  rows.push({ g, bg, banner, same });
  console.log('| ' + g + ' | ' + bg.hex + ' | ' + bg.from + ' | ' + banner + ' | ' + (same ? 'yes' : '**NO**') + ' |');
}
console.log('');
console.log('mismatched: ' + rows.filter(r => !r.same).map(r => r.g).join(', '));
