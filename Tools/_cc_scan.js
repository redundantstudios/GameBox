'use strict';
const fs = require('fs');
const s = fs.readFileSync('app/src/main/assets/games/chinese-checkers/index.html', 'utf8');
const h = s.slice(0, s.indexOf('-->'));
console.log('=== chinese-checkers manifest ===');
h.split(/\r?\n/).forEach(l => {
  if (/^\s*(id|title|minPlayers|maxPlayers|orientation|aiSupport|banner|players)/.test(l)) {
    console.log('  ' + l.trim());
  }
});

const k = fs.readFileSync('app/src/main/java/com/redundantstudios/arcade/ui/GameAdapter.kt', 'utf8').split(/\r?\n/);
console.log('\n=== tile player-count badge ===');
k.forEach((l, i) => {
  if (/maxPlayers|minPlayers|\+"P"|"P"|seat/i.test(l || '')) {
    console.log(String(i + 1).padStart(5) + ' | ' + (l || '').trim().slice(0, 96));
  }
});