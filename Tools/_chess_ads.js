'use strict';
const fs = require('fs');
const L = fs.readFileSync('app/src/main/assets/games/chess/index.html', 'utf8').split(/\r?\n/);
const show = (re, n, label) => {
  console.log('=== ' + label + ' ===');
  let c = 0;
  L.forEach((l, i) => { if (re.test(l || '') && c++ < (n || 10)) console.log(String(i + 1).padStart(5) + ' | ' + (l || '').trim().slice(0, 104)); });
  console.log('');
};
show(/NativeBridge|showRewardedAd|showInterstitial|__shellAd|Studio\.ads/, 14, 'real ad bridge usage');
show(/function showTestAd/, 22, 'showTestAd body');
show(/interstitial|rewarded/i, 10, 'ad kinds');