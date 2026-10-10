/* Coverage audit: for each game, is there an interstitial at each of the five
 * moments the brief names? Prints what exists rather than guessing, so gaps
 * are filled and correct existing calls are left alone.
 *
 * The trap this avoids: a game that shows an ad when its result screen APPEARS
 * and then has a PLAY AGAIN button on that same screen does NOT need another ad
 * on the button. Adding one is a duplicate request, not coverage.
 *
 * Run: node Tools/_interstitial_coverage.js [game ...]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const GAMES = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'games');

const ids = process.argv.slice(2).filter(a => !a.startsWith('-'));
const list = ids.length ? ids : fs.readdirSync(GAMES).sort();

const CALL = /ads\.interstitial\(|showInterstitial|withInterstitial\(|withAd\(|requestAd\(|showMidgame|gameInterstitial/;

// Each moment: what the call looks like when it is wired to THAT moment.
const MOMENTS = [
  ['game over', /state\s*===\s*['"](over|gameover|GAMEOVER|RESULT|TIMEUP|OVER)['"]|onGameOver|gameOver\s*\(|showOver|endRun|resultScreen|onDeath|whenDead/],
  ['restart', /againBtn|btnRestart|retryBtn|btnRetry|rematch|btnReplay|restartBtn|playAgain|btn-again|onRestart|restartRun/],
  ['menu', /btnMenu|menuBtn|btnHome|homeBtn|quitBtn|toMenu|quitToMenu|btn-home|exitToMenu/],
  ['replay in pause', /btnResume|btn-resume|pResume|resumeBtn|onResume/],
  ['win / level complete', /winModal|youWin|levelComplete|LEVEL_COMPLETE|completeModal|victory|onWin|showWin/],
];

console.log('game'.padEnd(20) + MOMENTS.map(m => m[0].slice(0, 13).padEnd(15)).join('') + 'total');
console.log('-'.repeat(20 + MOMENTS.length * 15 + 6));

for (const g of list) {
  const f = path.join(GAMES, g, 'index.html');
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, 'utf8');
  const lines = src.split(/\r?\n/);

  // Line numbers where an ad is actually requested.
  const adLines = [];
  for (let i = 0; i < lines.length; i++) if (CALL.test(lines[i] || '')) adLines.push(i);

  const cells = [];
  for (const [, momentRe] of MOMENTS) {
    // Is there an ad request within a few lines of a trigger for this moment?
    let hit = 0;
    for (let i = 0; i < lines.length; i++) {
      if (!momentRe.test(lines[i] || '')) continue;
      for (let k = Math.max(0, i - 4); k <= Math.min(lines.length - 1, i + 4); k++) {
        if (adLines.includes(k)) { hit++; break; }
      }
    }
    cells.push(hit ? 'yes(' + hit + ')' : '-');
  }

  console.log(g.padEnd(20) + cells.map(c => c.padEnd(15)).join('') + adLines.length);
}