'use strict';
const fs = require('fs');
const L = fs.readFileSync('app/src/main/assets/games/knot-away/index.html', 'utf8').split(/\r?\n/);
const show = (re, n, label) => {
  console.log('=== ' + label + ' ===');
  let c = 0;
  L.forEach((l, i) => { if (re.test(l || '') && c++ < (n || 10)) console.log(String(i + 1).padStart(5) + ' | ' + (l || '').trim().slice(0, 108)); });
  console.log('');
};
show(/function saveProgress|function persist|function loadProgress|LEVELS\s*=|const LEVELS|unlocked|stars/, 22, 'levels + progress');
show(/function drawLevels|function levelList|function drawLevel|lv-|levelCard|function geomLevel/, 16, 'level screen draw');
show(/toast\(|function toast|AdChip|adChip|chip/, 14, 'toast + ad chip');
show(/showRewardedAd|rewarded|function grantAd|adBtn/, 16, 'rewarded ad plumbing');
show(/function hitLevel|hitL|inL\(|UI\.lvl|UI\.lv/, 14, 'level hit tests');