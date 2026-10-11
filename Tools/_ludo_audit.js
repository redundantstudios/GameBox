'use strict';
const fs = require('fs');
const g = 'ludo';
const s = fs.readFileSync(`app/src/main/assets/games/${g}/index.html`, 'utf8');
const lines = s.split(/\r?\n/);

console.log('=== manifest ===');
lines.slice(0, 22).forEach((l, i) => {
  const t = (l || '').trim();
  if (/banner|^id:|^title:/.test(t)) console.log(String(i + 1).padStart(3) + ' | ' + t.slice(0, 60));
});

console.log('\n=== ad helpers ===');
lines.forEach((l, i) => {
  const t = (l || '').trim();
  if (/interstitial\s*[:(]|showInterstitial\s*[:(]|function .*[Ii]nterstitial/.test(t)) {
    console.log(String(i + 1).padStart(5) + ' | ' + t.slice(0, 92));
  }
});

console.log('\n=== buttons and handlers ===');
lines.forEach((l, i) => {
  const t = (l || '').trim();
  if (/addEventListener\(["']click["']|on\([^)]*["']click["']/.test(t)) {
    const ctx = lines.slice(i, i + 8).join(' ');
    const ad = /interstitial/i.test(ctx);
    console.log(String(i + 1).padStart(5) + ' | ' + (ad ? 'AD    ' : 'no-ad ') + t.slice(0, 84));
  }
});

console.log('\n=== game over ===');
lines.forEach((l, i) => {
  const t = (l || '').trim();
  if (/gameOver|winner|overPopup|showOver|finishGame|endGame|state\s*=\s*['"]over/i.test(t)) {
    console.log(String(i + 1).padStart(5) + ' | ' + t.slice(0, 90));
  }
});