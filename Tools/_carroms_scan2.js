'use strict';
const fs = require('fs');
const path = require('path');
const s = fs.readFileSync(path.join('app', 'src', 'main', 'assets', 'games', 'carroms', 'index.html'), 'utf8');
const lines = s.split(/\r?\n/);

const show = (re, n, label) => {
  console.log('=== ' + (label || re) + ' ===');
  let c = 0;
  lines.forEach((l, i) => { if (re.test(l || '') && c++ < (n || 8)) console.log(String(i + 1).padStart(5) + ' | ' + l.trim().slice(0, 104)); });
  console.log('');
};

show(/\.panel|transition|@keyframes|opacity:0;visibility:hidden|\.show|classList\.add\('on'\)/, 14, 'panel / transition');
show(/function S\(|tap\(\)|click\(\)|AudioSys\.tap|SFX\.tap|btn.*addEventListener\('click'/, 10, 'tap sound + clicks');
show(/unlockTheme|openPanel\('reward'\)|adnote|watchAd|grantReward/, 10, 'theme unlock / rewarded');
show(/onGameOver|gameOver|'over'|isOver|plaque|result|winner|checkWin/, 10, 'game over');
show(/function ensureAudio|unlock\(\)|A\.ctx|music|play\(|resume\(\)/, 12, 'audio / bgm');
show(/__shellBackBtn|shellScreen\(|syncShellOverlay|__shellBlock/, 10, 'shell back / screen');