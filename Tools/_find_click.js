/* Which function plays a UI click in each game that uses the shell's injected
 * BACK button? The BACK button should sound like the game it sits in, so this
 * finds each game's own click rather than borrowing the shell's.
 *
 * Run: node Tools/_find_click.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const GAMES = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'games');

const TARGET = ['colour-rush', 'ember', 'kiro', 'magnet-pull', 'midnight-overdrive',
  'orrery', 'pool-8ball', 'sheepdog-trials', 'root-io'];

for (const g of TARGET) {
  const f = path.join(GAMES, g, 'index.html');
  const src = fs.readFileSync(f, 'utf8');

  // A method or function whose name reads like a UI click.
  const cands = new Set();
  for (const m of src.matchAll(/(?:^|[^\w.])(?:function\s+)?([A-Za-z_$][\w$]*)\s*[(:=]/g)) {
    const n = m[1];
    if (/^(click|uiClick|ui|btn|tap|select|menu|hover|beep|blip|pop|ding)$/i.test(n)) cands.add(n);
  }
  // Also any object that exposes a click-ish method.
  for (const m of src.matchAll(/([A-Za-z_$][\w$]*)\s*[:=]\s*\{([^{}]{0,400}?\b(?:click|uiClick|tap|select)\s*\()/g)) {
    cands.add(m[1] + ' (object with click)');
  }

  console.log('=== ' + g + ' ===');
  if (!cands.size) { console.log('   (no obvious click found)'); continue; }
  for (const c of cands) {
    // Show the definition line so the name can be confirmed, not guessed.
    const re = new RegExp('(?:^|[^.\\w])' + c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[(:=]', 'm');
    const at = src.slice(0, 400).match(re);
    const line = at ? src.slice(0, at.index).split('\n').length : '?';
    console.log('   ' + c.padEnd(28) + ' first seen ~line ' + line);
  }
}