/* Fixes the grant condition in the Studio SDK shim of every modern game.
 *
 * THE BUG (serious, and mine)
 * The shim decided a reward by exclusion:
 *
 *     if(result!=='closed' && result!=='unavailable') onReward();
 *
 * That was safe when 'closed' and 'unavailable' were the only failures the
 * shell could return. It no longer is. AdPolicy now refuses ads on purpose and
 * says WHICH rule it hit, and the tokens it returns are:
 *
 *     limit_reached | cooldown | forbidden | first_session
 *
 * None of those is 'closed' or 'unavailable', so every policy refusal was
 * counted as a SUCCESSFUL WATCH. The player tapped "Watch ad to continue", no
 * ad appeared, and they were let straight back in - the reward was free and the
 * whole cap system was decorative. It looked exactly like "the button just
 * lets me play".
 *
 * THE FIX
 * Grant only on an explicit grant. The allow-list is the only correct shape
 * here: a deny-list silently grants on every token nobody thought of, which is
 * precisely how this happened.
 *
 *     node _fix_reward_grant.js
 */
const fs = require('fs');
const path = require('path');

const GAMES = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'games');

const OLD = "if(result!=='closed'&&result!=='unavailable'){ if(onReward) onReward(); }";
const NEW =
  "/* Grant ONLY on an explicit grant. A deny-list here is a trap: the shell\n" +
  "           returns limit_reached / cooldown / forbidden / first_session when it\n" +
  "           refuses, and none of those is 'closed' or 'unavailable' - so a\n" +
  "           refusal was being paid out as a successful watch, with no ad. */\n" +
  "          if(result==='granted'||result===''||result===undefined||result===null){ if(onReward) onReward(); }\n" +
  "          else if(onFail) onFail(result);";

let n = 0;
const skipped = [];

for (const dir of fs.readdirSync(GAMES).sort()) {
  const file = path.join(GAMES, dir, 'index.html');
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  if (!html.includes('window[cb]=function(result)')) continue; // not the modern shim
  if (!html.includes(OLD)) { skipped.push(dir + ' (already fixed or different shim)'); continue; }
  fs.writeFileSync(file, html.split(OLD).join(NEW), 'utf8');
  console.log('OK  ' + dir);
  n++;
}

console.log('\n' + n + ' game(s) fixed');
skipped.forEach((s) => console.log('  skipped ' + s));
