#!/usr/bin/env node
/* _check_chess_syntax.js - node --check every inline <script> block of the
   installed chess game so a bad integration patch can never ship. */
const fs = require('fs');
const { execFileSync } = require('child_process');
const os = require('os');
const path = require('path');

const html = fs.readFileSync('app/src/main/assets/games/chess/index.html', 'utf8');
const blocks = [];
const re = /<script>([\s\S]*?)<\/script>/g;
let m;
while ((m = re.exec(html))) blocks.push(m[1]);
if (!blocks.length) { console.error('no inline scripts found'); process.exit(2); }

let fail = 0;
blocks.forEach((src, i) => {
  const f = path.join(os.tmpdir(), `chess_block_${i}.js`);
  fs.writeFileSync(f, src);
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
    console.log(`  block ${i}: OK (${src.length} chars)`);
  } catch (e) {
    fail++;
    console.log(`  block ${i}: SYNTAX ERROR\n${e.stderr.toString().slice(0, 800)}`);
  }
  fs.unlinkSync(f);
});
console.log(fail === 0 ? 'ALL SCRIPT BLOCKS PARSE' : `${fail} BLOCK(S) FAILED`);
process.exit(fail === 0 ? 0 : 1);
