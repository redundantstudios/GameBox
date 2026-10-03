/* The two remaining deny-lists, in the games written in this pass.
 *
 * memory-grab carried the exact bug just fixed in the 10 modern games: a
 * deny-list, so every refusal token paid out as a successful watch.
 *
 * balloon-battle was correct today but fragile - it enumerated the refusal
 * tokens by hand, so the next token anyone adds silently pays out again.
 * Allow-listing is the only shape that fails safe.
 *
 *     node _fix_reward_grant2.js
 */
const fs = require('fs');
const path = require('path');

const GAMES = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'games');

const EDITS = [
  {
    game: 'memory-grab',
    from: "if(result!=='closed'&&result!=='unavailable'){if(onReward)onReward();}",
    to: "/* Grant ONLY on an explicit grant - see Tools/_fix_reward_grant.js. */\n        if(result==='granted'||result===''||result===undefined||result===null){if(onReward)onReward();}\n        else if(onFail)onFail(result);",
  },
  {
    game: 'balloon-battle',
    from: `      var granted=(result!=='closed'&&result!=='unavailable'&&result!=='limit_reached'&&
                   result!=='cooldown'&&result!=='forbidden'&&result!=='first_session');
      done(granted?true:result);`,
    to: `      /* Allow-list, not deny-list. Enumerating the refusal tokens by hand
         means the next one anyone adds pays out as a free reward. */
      var granted=(result==='granted'||result===''||result===undefined||result===null);
      done(granted?true:result);`,
  },
];

for (const e of EDITS) {
  const file = path.join(GAMES, e.game, 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  if (!html.includes(e.from)) { console.log('SKIP ' + e.game + ' (no match)'); continue; }
  fs.writeFileSync(file, html.split(e.from).join(e.to), 'utf8');
  console.log('OK   ' + e.game);
}
