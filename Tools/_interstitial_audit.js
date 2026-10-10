/* Where are the interstitial opportunities in each game?
 *
 * The brief is: an interstitial on game over / level complete, on restart, on
 * menu, on replay-from-pause, and on the win-popup buttons. This finds the
 * handlers for those moments so they can be judged one at a time instead of
 * being wired blind.
 *
 * Run: node Tools/_interstitial_audit.js [game ...]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const GAMES = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'games');

const ids = process.argv.slice(2).filter(a => !a.startsWith('-'));
const list = ids.length ? ids : fs.readdirSync(GAMES).sort();

// Button ids / labels that mean "end or restart the run".
const TRIGGER = /retry|restart|again|rematch|replay|resume|next|continue|menu|home|back|quit|start|play|btn\w*|btOk|btNew/;

for (const g of list) {
  const f = path.join(GAMES, g, 'index.html');
  if (!fs.existsSync(f)) continue;
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);

  const existing = [];
  const handlers = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i] || '';
    if (/ads\.interstitial\(|showInterstitial|withAd\(|requestAd\(|withInterstitial\(/.test(l)) {
      existing.push({ at: i + 1, l: l.trim() });
    }
    // A click/pointer binding whose id looks like a run-ending button.
    if (/(addEventListener\(\s*['"](click|touchend|pointerdown)['"]|\.onclick\s*=|onclick\s*=)/.test(l) && TRIGGER.test(l)) {
      handlers.push({ at: i + 1, l: l.trim() });
    }
  }

  console.log('\n===== ' + g + ' =====');
  console.log('  existing ad calls: ' + existing.length);
  existing.slice(0, 12).forEach(e => console.log('    ' + String(e.at).padStart(5) + ' | ' + e.l.slice(0, 96)));
  if (existing.length > 12) console.log('    ... +' + (existing.length - 12) + ' more');
  console.log('  candidate buttons: ' + handlers.length);
  handlers.slice(0, 14).forEach(e => console.log('    ' + String(e.at).padStart(5) + ' | ' + e.l.slice(0, 96)));
  if (handlers.length > 14) console.log('    ... +' + (handlers.length - 14) + ' more');
}