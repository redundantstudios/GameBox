/* Do the other games' boot watchdogs have the same flaw as kiro's?
 *
 * kiro's forced the menu if no MENU-type overlay was visible, and the gameplay
 * HUD was not in its list - so a player inside a level was bounced out. It only
 * ever showed on a first launch because the watchdog runs once, a few seconds
 * after boot.
 *
 * Run: node Tools/_watchdog_audit.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const GAMES = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'games');

for (const g of fs.readdirSync(GAMES).sort()) {
  const f = path.join(GAMES, g, 'index.html');
  if (!fs.existsSync(f)) continue;
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);

  const hit = lines.findIndex(l => /watchdog|no overlay after boot|forcing menu|no screen after boot/i.test(l || ''));
  if (hit < 0) continue;

  // Take the setTimeout body that follows.
  const body = lines.slice(hit, hit + 26).join('\n');
  const arrM = /\[[^\]]*\]/.exec(body);
  const watched = arrM ? arrM[0] : '(no list found)';
  const stateGuard = /state\s*===?\s*['"]play['"]|===?\s*['"]playing['"]/.test(body);

  console.log('=== ' + g + ' ===');
  console.log('  guards on a playing state : ' + (stateGuard ? 'YES' : 'NO  <-- may bounce'));
  console.log('  watches                   : ' + watched.slice(0, 150));
  console.log('');
}