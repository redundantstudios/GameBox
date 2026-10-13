'use strict';
const fs = require('fs');
const { execSync } = require('child_process');
const files = execSync('git ls-files', { cwd: process.cwd() })
  .toString().split(/\r?\n/).filter(x => x.endsWith('.kt'));
const tags = new Set();
files.forEach(x => {
  const s = fs.readFileSync(x, 'utf8');
  (s.match(/TAG\s*=\s*"([^"]+)"/g) || []).forEach(m => tags.add(m));
});
console.log([...tags].join('\n') || '(no TAG constants)');
console.log('--- files with Log. ---');
files.forEach(x => {
  const s = fs.readFileSync(x, 'utf8');
  if (/Log\.[diewv]\(/.test(s)) console.log('  ' + x);
});