'use strict';
const fs = require('fs');
const dir = 'app/src/main/assets/games/chicken-chaos';
console.log('files:', fs.readdirSync(dir).join(', '));
const s = fs.readFileSync(dir + '/index.html', 'utf8');
const lines = s.split(/\r?\n/);

console.log('\n=== declarations of state ===');
lines.forEach((l, i) => {
  const t = (l || '').trim();
  if (/\b(var|let|const|function)\s+state\b/.test(t) || /\bstate\s*[,;=]/.test(t)) {
    console.log(String(i + 1).padStart(5) + ' | ' + t.slice(0, 92));
  }
});

console.log('\n=== bare `state` reads/writes (first 25) ===');
let n = 0;
lines.forEach((l, i) => {
  const t = (l || '').trim();
  if (n >= 25) return;
  if (/(^|[^\w.$])state\s*(=|\)|,|;|\.|===|!==|\?\?|\|\||&&)/.test(t) && !/\bstate\s*[:=]\s*'/.test(t) === false || /(^|[^\w.$'"])state\s*(=|\))/.test(t)) {
    console.log(String(i + 1).padStart(5) + ' | ' + t.slice(0, 92));
    n++;
  }
});

console.log('\n=== error reporting ===');
lines.forEach((l, i) => {
  const t = (l || '').trim();
  if (/showFatal|FATAL|game error|GAME ERROR|catch\s*\(/.test(t)) {
    console.log(String(i + 1).padStart(5) + ' | ' + t.slice(0, 92));
  }
});