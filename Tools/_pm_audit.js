'use strict';
const fs = require('fs');
const g = process.argv[2] || 'planet-merge';
const s = fs.readFileSync(`app/src/main/assets/games/${g}/index.html`, 'utf8');
const lines = s.split(/\r?\n/);

console.log('=== manifest / bg ===');
lines.slice(0, 20).forEach((l, i) => {
  const t = (l || '').trim();
  if (/banner|title:|id:/.test(t)) console.log(String(i + 1).padStart(3) + ' | ' + t.slice(0, 70));
});
console.log('\n=== page background ===');
lines.forEach((l, i) => {
  const t = (l || '').trim();
  if (/body\s*\{|background:\s*(var\(--|#[0-9a-fA-F]{3,6})|--bg\b|clearColor|fillStyle\s*=\s*["']#[0-9a-fA-F]{6}/.test(t) && i < 160) {
    console.log(String(i + 1).padStart(5) + ' | ' + t.slice(0, 84));
  }
});

console.log('\n=== click handlers + ad nearby ===');
lines.forEach((l, i) => {
  const t = (l || '').trim();
  if (!/addEventListener\(["']click["']/.test(t)) return;
  const ctx = lines.slice(i, i + 8).join(' ');
  const ad = /interstitial|rewarded/i.test(ctx);
  const label = t.replace(/\s*addEventListener.*$/, '').replace(/[=$()"'\s]/g, '').slice(0, 24);
  console.log(String(i + 1).padStart(5) + ' | ' + (ad ? 'AD    ' : 'no-ad ') + label);
});

console.log('\n=== ad helpers / game over ===');
lines.forEach((l, i) => {
  const t = (l || '').trim();
  if (/function .*[Ii]nterstitial|Studio\.ads\.interstitial|showGameOver|function gameOver|overPopup|showOver|MAIN MENU|btnMenu|btnMain/i.test(t)) {
    console.log(String(i + 1).padStart(5) + ' | ' + t.slice(0, 90));
  }
});