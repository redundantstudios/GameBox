/* Makes each modern game SHOW the shell's refusal reason instead of swallowing it.
 *
 * WHY
 * The shell now refuses ads on purpose - a second revive in one game, the
 * per-game cap, the 60s cooldown. It answers with a REASON ("limit_reached",
 * "cooldown", ...) instead of silence, because the player tapped a button and
 * silence there just looks like a broken app. But a reason token is not a
 * sentence: showing the raw token on screen would look like a crash.
 *
 * Studio.adsMessage() (added to every game by _propagate_adshim.js) turns the
 * token into English. This script points each game's failure path at it.
 *
 *     node _show_ad_reasons.js
 */
const fs = require('fs');
const path = require('path');

const GAMES = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'games');

/**
 * Each entry: a literal snippet to replace, and its replacement.
 * `lastAdReason` is captured in the game's own AD object, so the reason
 * survives from the request to the point where the game decides what to say.
 */
const EDITS = [
  {
    game: 'root-io',
    from: "$('goAdStatus').textContent='Ad unavailable. Check your connection and try again.';",
    to: "$('goAdStatus').textContent=Studio.adsMessage(lastAdReason);",
  },
  {
    game: 'root-io',
    from: "    var self=this;\n    function finish(ok){\n      self.setMute(false);\n      adActive=false;\n      if(done)done(ok);\n    }\n    if(!this.canRewarded()){ finish(false); return; }\n    Studio.ads.rewarded(\n      'rootio_continue',\n      function(){ finish(true); },\n      function(){ finish(false); }\n    );",
    to: "    var self=this;\n    /* Kept so the CALLER can explain a refusal. The shell denies on purpose\n       (one revive per game, five rewards per game, a 60s cooldown) and says\n       WHICH rule it hit; with nowhere to put that, the game would show a generic\n       message and the player would think the button is broken. */\n    lastAdReason='unavailable';\n    function finish(ok,reason){\n      self.setMute(false);\n      adActive=false;\n      if(!ok)lastAdReason=reason||'unavailable';\n      if(done)done(ok);\n    }\n    if(!this.canRewarded()){ finish(false,'unavailable'); return; }\n    Studio.ads.rewarded(\n      'rootio_continue',\n      function(){ finish(true); },\n      function(reason){ finish(false,reason); }\n    );",
  },
  {
    game: 'root-io',
    from: "let sessionRetries=0,lastMidgameRetry=0,adBusy=false,adActive=false,runFinalized=false,deathSnapshot=null,adUnlockKey=null;",
    to: "let sessionRetries=0,lastMidgameRetry=0,adBusy=false,adActive=false,runFinalized=false,deathSnapshot=null,adUnlockKey=null;\n/* Why the shell last refused an ad, so the UI can say it in English. */\nlet lastAdReason='unavailable';",
  },
];

let n = 0;
for (const edit of EDITS) {
  const file = path.join(GAMES, edit.game, 'index.html');
  if (!fs.existsSync(file)) { console.log('SKIP ' + edit.game + ' (missing)'); continue; }
  const html = fs.readFileSync(file, 'utf8');
  if (!html.includes(edit.from)) { console.log('SKIP ' + edit.game + ' (no match)'); continue; }
  if (html.includes(edit.to)) { console.log('SKIP ' + edit.game + ' (already done)'); continue; }
  fs.writeFileSync(file, html.split(edit.from).join(edit.to), 'utf8');
  console.log('OK   ' + edit.game);
  n++;
}
console.log('\n' + n + ' edited');
